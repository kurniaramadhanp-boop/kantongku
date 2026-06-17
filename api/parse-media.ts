import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateContentWithRetry(options: any, maxRetries = 2) {
  let attempt = 0;
  // Menyesuaikan model rilis stabil terkini untuk performa terbaik
  const modelsToTry = [options.model, "gemini-2.5-flash", "gemini-1.5-flash"];
  
  while (true) {
    try {
      const currentModel = modelsToTry[Math.min(attempt, modelsToTry.length - 1)];
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      
      if (attempt < modelsToTry.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      
      throw error;
    }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mediaData, tipeMedia } = req.body;
    if (!mediaData || !tipeMedia) {
      return res.status(400).json({ error: "Data media dan tipeMedia wajib disertakan" });
    }

    let cleanBase64 = mediaData;
    if (mediaData.includes(";base64,")) {
      cleanBase64 = mediaData.split(";base64,")[1];
    }

    // Menggunakan parameter generateContent yang sesuai standar SDK @google/genai terbaru
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
        systemInstruction: "Kamu adalah mesin parser JSON untuk aplikasi KantongKu. Tugasmu adalah menerima input (teks ucapan, transkrip suara, atau foto struk) dari user, lalu mengubahnya menjadi format transaksi terstruktur. Wajib keluarkan data dalam bentuk JSON mentah yang valid. PENTING: Jika audio tidak terdengar jelas, kosong, atau gambar tidak mengandung transaksi, JANGAN mengarang data. Kembalikan nominal 0, catatan 'Tidak terdeteksi', dan kategori 'Lainnya'.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            nominal: { type: "INTEGER", description: "Jumlah uang dalam bentuk angka integer. Jika tidak ada, isi 0." },
            kategori: { type: "STRING", description: "Kategori pengeluaran/pemasukan. Jika tidak tahu, isi 'Lainnya'." },
            catatan: { type: "STRING", description: "Keterangan singkat tentang transaksi. Jika suara tidak jelas, tulis 'Tidak terdeteksi'." },
            tipe: { type: "STRING", description: "Pilih wajib antara: 'pemasukan' atau 'pengeluaran'." }
          },
          required: ["nominal", "kategori", "catatan", "tipe"]
        }
      }
    });

    // Mengambil text hasil dari struktur respons SDK baru secara aman
    const textResult = response.text || "{}";
    const parsedData = JSON.parse(textResult);
    
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error("Gagal melakukan parse media:", error);
    return res.status(500).json({ error: error.message || "Gagal memproses struk/suara via AI" });
  }
}