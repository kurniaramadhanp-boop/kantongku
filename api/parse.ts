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
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Input teks tidak boleh kosong" });
    }

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: `Parse input berikut: "${prompt}"

Aturan Khusus:
1. Jika ada kata-kata seperti 'futsal', 'arisan', 'kas kelas', maka otomatis 'kepemilikan' harus "Uang Orang".
2. Jika menyebut kata 'usaha', 'modal', 'omset', maka 'kepemilikan' harus "Uang Bisnis".
3. Jika tidak memenuhi aturan diatas, tentukan nilai yang paling relevan (atau default "Uangku").
4. "nominal" harus berupa angka bilangan bulat (integer), jika tidak terdeteksi isi saja 0.
5. "kategori" pilih salah satu yang paling cocok atau sesuai konteks dari daftar berikut atau sejenisnya: Jajan, Makan, Kas_RT, Futsal, Modal_Bisnis, dll.
6. "sumber_dana" tentukan yang paling cocok atau sebutkan bank/e-wallet yang ada (seperti Bank_BCA, Dana, GoPay, Cash) atau default "Cash" jika tidak disebutkan.
7. "catatan" berikan keterangan singkat dari transaksi tersebut.`,
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
    console.error("Gagal melakukan parse:", error);
    res.status(500).json({ error: error.message || "Gagal memproses input dengan AI" });
  }
}
