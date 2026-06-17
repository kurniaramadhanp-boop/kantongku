import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini SDK with telemetry User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Robust helper with retries and fallback models for high demand or transient API failures
async function generateContentWithRetry(options: any, maxRetries = 2) {
  let attempt = 0;
  // Menyesuaikan dengan daftar model stabil terbaru yang dikenali SDK baru
  const modelsToTry = [options.model, "gemini-2.5-flash", "gemini-1.5-flash"];
  
  while (true) {
    try {
      const currentModel = modelsToTry[Math.min(attempt, modelsToTry.length - 1)];
      console.log(`[Gemini API] Attempt ${attempt + 1}: calling model ${currentModel}`);
      
      const response = await ai.models.generateContent({
        ...options,
        model: currentModel
      });
      return response;
    } catch (error: any) {
      attempt++;
      const isTransient = error.message?.includes("503") || 
                          error.message?.includes("UNAVAILABLE") || 
                          error.message?.includes("high demand") ||
                          error.message?.includes("Rate limit") ||
                          error.status === 503;
                          
      if (attempt <= maxRetries && isTransient) {
        console.warn(`[Gemini API] Transient error (attempt ${attempt}): ${error.message}. Retrying in 1s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      
      if (attempt < modelsToTry.length) {
        console.warn(`[Gemini API] Error on model call. Trying fallback model: ${modelsToTry[attempt]}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      
      throw error;
    }
  }
}

// API Routes
app.post("/api/parse", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Input teks tidak boleh kosong" });
    }

    // PERBAIKAN: Struktur parameter 'contents' disesuaikan dengan aturan @google/genai terbaru
    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `Parse input berikut: "${prompt}"` }]
        }
      ],
      config: {
        systemInstruction: "Kamu adalah mesin parser JSON untuk aplikasi KantongKu. Tugasmu adalah menerima input (teks ucapan, transkrip suara, atau foto struk) dari user, lalu mengubahnya menjadi format transaksi terstruktur. Wajib keluarkan data dalam bentuk JSON mentah yang valid. PENTING: JANGAN mengarang data jika konteks tidak jelas.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            nominal: { type: "INTEGER", description: "Jumlah uang dalam bentuk angka integer." },
            kategori: { type: "STRING", description: "Kategori pengeluaran/pemasukan. Jika tidak tahu, isi 'Lainnya'." },
            catatan: { type: "STRING", description: "Keterangan singkat tentang transaksi." },
            tipe: { type: "STRING", description: "Pilih wajib antara: 'pemasukan' atau 'pengeluaran'." }
          },
          required: ["nominal", "kategori", "catatan", "tipe"]
        }
      }
    });

    const textResult = response.text || "{}";
    const parsedData = JSON.parse(textResult);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gagal melakukan parse:", error);
    res.status(500).json({ error: error.message || "Gagal memproses input dengan AI" });
  }
});

// Parse Media (Image/Audio Base64) Secure Proxy Route
app.post("/api/parse-media", async (req, res) => {
  try {
    const { mediaData, tipeMedia } = req.body;
    if (!mediaData || !tipeMedia) {
      return res.status(400).json({ error: "Data media dan tipeMedia wajib disertakan" });
    }

    let cleanBase64 = mediaData;
    if (mediaData.includes(";base64,")) {
      cleanBase64 = mediaData.split(";base64,")[1];
    }

    // PERBAIKAN: Menggunakan model stabil 'gemini-2.5-flash' dan skema tipe string
    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Bongkar input ini menjadi data JSON transaksi keuangan sesuai instruksi sistem." },
            {
              inlineData: {
                mimeType: tipeMedia,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: "Kamu adalah mesin parser JSON untuk aplikasi KantongKu. Tugasmu adalah menerima input (teks ucapan, transkrip suara, atau foto struk) dari user, lalu mengubahnya menjadi format transaksi terstruktur yang siap dimasukkan ke database Firebase. Wajib keluarkan data dalam bentuk JSON mentah yang valid. PENTING: Jika audio tidak terdengar jelas, kosong, atau gambar tidak mengandung transaksi, JANGAN mengarang data. Kembalikan nominal 0, catatan 'Tidak terdeteksi', dan kategori 'Lainnya'.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            nominal: { type: "INTEGER", description: "Jumlah uang dalam bentuk angka integer. Jika tidak ada, isi 0." },
            kategori: { type: "STRING", description: "Kategori pengeluaran/pemasukan. Jika tidak tahu, isi 'Lainnya'." },
            catatan: { type: "STRING", description: "Keterangan singkat tentang transaksi. Jika suara tidak jelas, tulis 'Tidak terdeteksi'." },
            sumber_dana: { type: "STRING", description: "Sumber dana (Bank_BCA / Dana / GoPay / Cash). Default: 'Cash'." },
            kepemilikan: { type: "STRING", description: "Pilih wajib antara: 'Uangku' (pribadi), 'Uang Orang' (grup/kas), atau 'Uang Bisnis'." }
          },
          required: ["nominal", "kategori", "catatan", "sumber_dana", "kepemilikan"]
        }
      }
    });

    const textResult = response.text || "{}";
    const parsedData = JSON.parse(textResult);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gagal melakukan parse media:", error);
    res.status(500).json({ error: error.message || "Gagal memproses struk/suara via AI" });
  }
});

// Vite Middleware Setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();