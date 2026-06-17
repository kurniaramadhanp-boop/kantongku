import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateContentWithRetry(options: any, maxRetries = 2) {
  let attempt = 0;
  const modelsToTry = [options.model, "gemini-flash-latest", "gemini-3.1-flash-lite"];
  
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
        systemInstruction: "Kamu adalah mesin parser JSON untuk aplikasi KantongKu. Tugasmu adalah menerima input (teks ucapan, transkrip suara, atau foto struk) dari user, lalu mengubahnya menjadi format transaksi terstruktur yang siap dimasukkan ke database Firebase. Wajib keluarkan data dalam bentuk JSON mentah yang valid.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nominal: { type: Type.INTEGER, description: "Jumlah uang dalam bentuk angka integer." },
            kategori: { type: Type.STRING, description: "Kategori pengeluaran/pemasukan seperti Jajan / Makan / Kas_RT / Futsal / Modal_Bisnis / dll." },
            catatan: { type: Type.STRING, description: "Keterangan singkat tentang transaksi." },
            sumber_dana: { type: Type.STRING, description: "Sumber dana yang digunakan, contoh: Bank_BCA / Dana / GoPay / Cash / dll." },
            kepemilikan: { type: Type.STRING, description: "Ditentukan secara otomatis: 'Uangku' (default), 'Uang Orang' (futsal, arisan, kas kelas) atau 'Uang Bisnis' (usaha, modal, omset)." }
          },
          required: ["nominal", "kategori", "catatan", "sumber_dana", "kepemilikan"]
        }
      }
    });

    const textResult = response.text || "{}";
    const parsedData = JSON.parse(textResult);
    res.status(200).json(parsedData);
  } catch (error: any) {
    console.error("Gagal melakukan parse media:", error);
    res.status(500).json({ error: error.message || "Gagal memproses struk/suara via AI" });
  }
}
