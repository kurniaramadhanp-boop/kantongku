import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
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
  const modelsToTry = [options.model, "gemini-flash-latest", "gemini-3.1-flash-lite"];
  
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
      
      // If we still have fallback models, let's try other models in sequence
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

    // Call Gemini with structured JSON output rules
    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: `Parse input berikut: "${prompt}"

Aturan Khusus:
1. Jika ada kata-kata seperti 'futsal', 'arisan', 'kas kelas', maka otomatis 'kepemilikan' harus "Uang Orang".
2. Jika menyebut kata 'usaha', 'modal', 'omset', maka 'kepemilikan' harus "Uang Bisnis".
3. Jika tidak memenuhi aturan diatas, tentukan nilai yang paling relevan (atau default "Uangku").
4. "nominal" harus berupa angka bilangan bulat (integer), jika tidak terdeteksi isi saja 0.
5. "kategori" pilih salah satu yang paling cocok atau sesuai konteks. Jika tidak tahu isi "Lainnya".
6. "sumber_dana" tentukan yang paling cocok atau sebutkan bank/e-wallet yang ada (seperti Bank_BCA, Dana, GoPay, Cash) atau default "Cash" jika tidak disebutkan.
7. "catatan" berikan keterangan singkat dari transaksi tersebut.`,
      config: {
        systemInstruction: "Kamu adalah mesin parser JSON untuk aplikasi KantongKu. Tugasmu adalah menerima input (teks ucapan, transkrip suara, atau foto struk) dari user, lalu mengubahnya menjadi format transaksi terstruktur yang siap dimasukkan ke database Firebase. Wajib keluarkan data dalam bentuk JSON mentah yang valid. PENTING: JANGAN mengarang data jika konteks tidak jelas.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nominal: { type: Type.INTEGER, description: "Jumlah uang dalam bentuk angka integer." },
            kategori: { type: Type.STRING, description: "Kategori pengeluaran/pemasukan. Jika tidak tahu, isi 'Lainnya'." },
            catatan: { type: Type.STRING, description: "Keterangan singkat tentang transaksi." },
            sumber_dana: { type: Type.STRING, description: "Sumber dana yang digunakan. Default: 'Cash'." },
            kepemilikan: { type: Type.STRING, description: "Pilih: 'Uangku' (default), 'Uang Orang', atau 'Uang Bisnis'." }
          },
          required: ["nominal", "kategori", "catatan", "sumber_dana", "kepemilikan"]
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

    // Strip base64 headers if present (e.g. "data:image/jpeg;base64,")
    let cleanBase64 = mediaData;
    if (mediaData.includes(";base64,")) {
      cleanBase64 = mediaData.split(";base64,")[1];
    }

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
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
          type: Type.OBJECT,
          properties: {
            nominal: { type: Type.INTEGER, description: "Jumlah uang dalam bentuk angka integer. Jika tidak ada, isi 0." },
            kategori: { type: Type.STRING, description: "Kategori pengeluaran/pemasukan. Jika tidak tahu, isi 'Lainnya'." },
            catatan: { type: Type.STRING, description: "Keterangan singkat tentang transaksi. Jika suara tidak jelas, tulis 'Tidak terdeteksi'." },
            sumber_dana: { type: Type.STRING, description: "Sumber dana (Bank_BCA / Dana / GoPay / Cash). Default: 'Cash'." },
            kepemilikan: { type: Type.STRING, description: "Pilih: 'Uangku' (pribadi), 'Uang Orang' (grup/kas), atau 'Uang Bisnis'." }
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
