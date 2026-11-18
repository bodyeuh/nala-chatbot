import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Kamu adalah "Nala", chatbot belajar AI untuk siswa SMP (usia 12-15 tahun) di Indonesia.

GAYA BICARA:
- Selalu gunakan Bahasa Indonesia santai, ramah, hangat, dan mudah dipahami remaja.
- Jawaban SINGKAT: maksimal 100 kata, kecuali siswa minta penjelasan lebih detail.
- JANGAN gunakan emoji. JANGAN gunakan format Markdown (tanpa **, #, tabel, atau bullet bertingkat). Gunakan teks polos, boleh pakai simbol terminal seperti ">>", "-", "*", dan "[OK]".
- Gunakan analogi kehidupan sehari-hari siswa SMP: rekomendasi video TikTok/YouTube, asisten suara di HP, filter kamera, game, GPS, media sosial.
- Semangat dan suportif. Tidak ada pertanyaan yang dianggap bodoh.

ATURAN:
- Fokus pada topik AI: pengertian AI, machine learning, neural network, data, AI generatif, cara membuat prompt yang bagus, etika AI, deepfake dan hoaks, keamanan data pribadi, serta karier di dunia teknologi.
- Jika ditanya di luar topik AI, jawab singkat sekali saja, lalu ajak kembali belajar AI bersama.
- Jika ada permintaan tidak pantas, tidak aman, atau berbahaya untuk anak-anak, tolak dengan sopan dan arahkan ke topik yang aman.
- Jangan mengarang fakta, angka, atau tanggal. Kalau tidak yakin, katakan jujur dan sarankan mencari sumber terpercaya.
- Jika pengguna mengetik "/kuis", mulai mode kuis: berikan SATU soal pilihan ganda mudah tentang AI (pilihan A/B/C/D), tunggu jawaban siswa, lalu nilai jawabannya, beri pembahasan singkat, dan tawarkan soal berikutnya.
- Sesekali (tidak setiap pesan), akhiri jawaban dengan satu pertanyaan ringan untuk menjaga semangat belajar siswa.`;

/* ================= MODE AI PENUH (OPSIONAL) =================
   Aktif otomatis jika salah satu environment variable diatur:
   - ZAI_API_KEY     (https://api.z.ai — tersedia model gratis)
   - OPENAI_API_KEY  (provider kompatibel OpenAI apa pun)
   Tanpa API key, chatbot berjalan di MODE DASAR (bank jawaban lokal). */

interface ProviderConfig {
  url: string;
  key: string;
  model: string;
}

function buildProviderConfig(): ProviderConfig | null {
  if (process.env.ZAI_API_KEY) {
    const base = (process.env.ZAI_API_BASE || "https://api.z.ai/api/paas/v4").replace(/\/$/, "");
    return { url: `${base}/chat/completions`, key: process.env.ZAI_API_KEY, model: process.env.ZAI_MODEL || "glm-4-flash" };
  }
  if (process.env.OPENAI_API_KEY) {
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    return { url: `${base}/chat/completions`, key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4o-mini" };
  }
  return null;
}

async function askAI(history: { role: "user" | "assistant"; content: string }[]): Promise<string | null> {
  const cfg = buildProviderConfig();
  if (!cfg) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        temperature: 0.7,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 0 ? content.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/* ================= MODE DASAR (TANPA API KEY) =================
   Bank jawaban lokal untuk pertanyaan AI yang paling sering
   ditanyakan siswa, plus kuis pilihan ganda yang tetap jalan. */

interface Soal {
  soal: string;
  pilihan: string[];
  jawaban: "A" | "B" | "C" | "D";
  bahas: string;
}

const KUIS: Soal[] = [
  {
    soal: "Apa kepanjangan dari AI?",
    pilihan: ["A. Automatic Internet", "B. Artificial Intelligence", "C. Aktif Intelek", "D. Antara Ilmu"],
    jawaban: "B",
    bahas: "AI = Artificial Intelligence, atau kecerdasan buatan: program komputer yang dibuat untuk berpikir dan bertindak seperti manusia.",
  },
  {
    soal: "Apa 'makanan' utama agar mesin bisa belajar (machine learning)?",
    pilihan: ["A. Bensin", "B. Listrik saja", "C. Data", "D. Layar sentuh"],
    jawaban: "C",
    bahas: "Machine learning butuh DATA dalam jumlah banyak. Dari data itulah mesin menemukan pola, seperti kamu makin jago game makin sering main.",
  },
  {
    soal: "Manakah contoh AI yang kamu pakai sehari-hari?",
    pilihan: ["A. Rekomendasi video di TikTok", "B. Pulsa internet", "C. Kertas HVS", "D. Penggaris"],
    jawaban: "A",
    bahas: "Rekomendasi TikTok/YouTube, filter kamera, asisten suara, dan GPS semuanya memakai AI untuk mengenali pola kebiasaan kita.",
  },
  {
    soal: "Istilah untuk AI yang bisa membuat teks, gambar, atau lagu baru adalah...",
    pilihan: ["A. AI statistik", "B. AI generatif", "C. AI manual", "D. AI offline"],
    jawaban: "B",
    bahas: "AI generatif (seperti ChatGPT) membuat konten BARU dari pola yang sudah dipelajari, bukan sekadar menyalin.",
  },
  {
    soal: "Sikap paling bijak saat melihat informasi seru di internet adalah...",
    pilihan: ["A. Langsung bagikan", "B. Percaya tanpa berpikir", "C. Cek kebenarannya dulu", "D. Hapus semua aplikasi"],
    jawaban: "C",
    bahas: "AI bisa menghasilkan hoaks dan deepfake. Selalu cek sumber terpercaya sebelum percaya atau membagikan informasi.",
  },
];

function tampilkanSoal(n: number): string {
  const s = KUIS[n - 1];
  return [
    `[SOAL ${n}/5]`,
    s.soal,
    ...s.pilihan,
    "",
    ">> Jawab dengan huruf A, B, C, atau D",
  ].join("\n");
}

function nilaiKuis(history: { role: string; content: string }[]): string | null {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content.trim().toUpperCase() ?? "";
  const lastNala = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const match = lastNala.match(/\[SOAL (\d)\/5\]/);
  if (!match) return null;

  const n = parseInt(match[1], 10);
  const soal = KUIS[n - 1];

  if (!/^[ABCD]$/.test(lastUser)) {
    return "Jawabannya cuma satu huruf ya: A, B, C, atau D.\n\n" + tampilkanSoal(n);
  }

  const benar = lastUser === soal.jawaban;
  const skorLalu = history.filter((m) => m.role === "assistant" && m.content.includes("[BENAR]")).length;
  const skor = skorLalu + (benar ? 1 : 0);

  const hasil = benar ? "[BENAR]" : `[BELUM TEPAT] Jawaban yang benar: ${soal.jawaban}`;
  const lanjut = n < KUIS.length ? tampilkanSoal(n + 1) : null;

  if (lanjut) {
    return [hasil, soal.bahas, "", lanjut].join("\n");
  }
  return [
    hasil,
    soal.bahas,
    "",
    `[SKOR AKHIR: ${skor}/${KUIS.length}]`,
    skor >= 4 ? ">> Keren banget! Kamu calon ahli AI." : ">> Tidak apa-apa, belajar itu proses. Coba lagi dengan /kuis atau jelajahi /topik!",
  ].join("\n");
}

function cariJawaban(topik: string[]): string | null {
  const teks = topik.join("\n").toLowerCase();
  const ada = (...kata: string[]) => kata.some((k) => teks.includes(k));

  if (ada("machine learning", "pembelajaran mesin", " mesin belajar")) {
    return [
      "Machine learning = cara mesin BELAJAR dari data, bukan diprogram aturan satu per satu.",
      "",
      ">> Analogi: seperti kamu belajar mengenali kucing dari melihat ratusan foto kucing.",
      ">> Contoh: filter wajah, rekomendasi lagu, deteksi spam email.",
      "",
      'Mau lanjut? Ketik "apa itu neural network"',
    ].join("\n");
  }
  if (ada("neural", "jaringan saraf", "otak digital")) {
    return [
      "Neural network = program yang meniru cara kerja otak manusia.",
      "",
      ">> Terdiri dari 'neuron digital' yang tersambung seperti jaringan.",
      ">> Analogi: rambu-rambu lalu lintas yang saling terhubung, info diteruskan sampai ada keputusan.",
      ">> Dipakai untuk: mengenali wajah, suara, dan gambar.",
      "",
      'Ketik "apa itu AI generatif" untuk lanjut!',
    ].join("\n");
  }
  if (ada("generatif", "chatgpt", "gemini", "buat gambar", "bikin gambar", "membuat gambar", "buat teks", "bikin teks")) {
    return [
      "AI generatif = AI yang bisa MEMBUAT hal baru: teks, gambar, musik, bahkan video.",
      "",
      ">> Contoh: ChatGPT (teks), Gemini, DALL-E (gambar).",
      ">> Ia belajar dari jutaan contoh, lalu 'berimprovisasi' seperti musisi.",
      "",
      ">> Ingat: hasilnya belum tentu benar. Selalu periksa ulang ya!",
    ].join("\n");
  }
  if (ada("prompt", "cara nanya", "cara bertanya", "cara pakai ai", "cara memakai ai", "cara ngobrol")) {
    return [
      "Prompt = perintah atau pertanyaan yang kamu tulis ke AI.",
      "",
      ">> Tips prompt bagus:",
      "- Spesifik: 'Jelaskan fotosintesis untuk anak SMP' lebih baik dari 'fotosintesis'",
      "- Beri konteks: untuk apa, untuk siapa",
      "- Minta bentuk: 'jelaskan dengan analogi game'",
      "",
      ">> Prompt bagus = jawaban bagus. Coba sekarang!",
    ].join("\n");
  }
  if (ada("hoaks", "hoax", "berita palsu", "deepfake", "etika", "privasi", "data pribadi", "aman", "bahaya", "bahayanya")) {
    return [
      "AI itu alat: bisa untuk kebaikan, bisa disalahgunakan.",
      "",
      ">> Bahaya yang perlu diwaspadai:",
      "- Deepfake: video/suara palsu yang terlihat asli",
      "- Hoaks buatan AI yang menyebar cepat",
      "- Data pribadi yang dikumpulkan tanpa izin",
      "",
      ">> Tips: jangan bagikan data pribadi, cek sumber berita, dan tanya guru/orang tua kalau ragu.",
    ].join("\n");
  }
  if (ada("karier", "kerja", "profesi", "masa depan", "mau jadi")) {
    return [
      "Dunia AI penuh karier seru di masa depan!",
      "",
      ">> Data Scientist: peneliti pola dari data",
      ">> AI Engineer: pembangun sistem AI",
      ">> Prompt Engineer: ahli berkomunikasi dengan AI",
      ">> Robot Engineer: perancang robot pintar",
      "",
      ">> Mulai dari sekarang: rajin belajar, penasaran, dan jangan takut mencoba!",
    ].join("\n");
  }
  if (ada("data", "makanan ai")) {
    return [
      "Data = bahan mentah AI. Tanpa data, AI tidak bisa apa-apa.",
      "",
      ">> Analogi: data itu seperti resep dan bahan masakan.",
      ">> Semakin banyak dan bagus datanya, semakin pintar AI-nya.",
      ">> Data bisa berupa teks, gambar, suara, atau video.",
      "",
      'Mau tahu cara AI "belajar"? Ketik "apa itu machine learning"',
    ].join("\n");
  }
  if (ada("apa itu ai", "apa itu kecerdasan", "kecerdasan buatan", "pengertian ai", "kenalan ai", "jelaskan ai", "apa sih ai", "artificial intelligence")) {
    return [
      "AI (Artificial Intelligence) = program komputer yang dibuat supaya bisa 'berpikir' seperti manusia.",
      "",
      ">> Bisa mengenali gambar, suara, menjawab pertanyaan, dan belajar dari data.",
      ">> Contoh di HP kamu: asisten suara, filter kamera, rekomendasi TikTok, GPS.",
      ">> AI tidak punya perasaan, ia cuma sangat pintar mengenali POLA.",
      "",
      'Ketik "apa itu machine learning" untuk langkah berikutnya!',
    ].join("\n");
  }
  if (ada("halo", "hai", "hallo", "selamat pagi", "selamat siang", "selamat sore", "assalamualaikum", "hei", "hi ")) {
    return [
      "Halo juga! Semangat belajar hari ini!",
      "",
      ">> Aku Nala, teman belajar AI kamu.",
      ">> Ketik /topik untuk lihat semua topik, atau /kuis untuk uji pengetahuan.",
      "",
      "Mau mulai dari mana?",
    ].join("\n");
  }
  if (ada("siapa kamu", "siapa nala", "tentang kamu", "perkenalkan")) {
    return [
      "Aku Nala, chatbot belajar AI khusus siswa SMP Budi Mulia Karawang.",
      "",
      ">> Aku bisa menjelaskan AI pakai bahasa sederhana.",
      ">> Aku punya kuis seru: ketik /kuis",
      ">> Daftar topikku: ketik /topik",
      "",
      "Yuk mulai!",
    ].join("\n");
  }
  if (ada("makasih", "terima kasih", "thanks", "thank you", "keren", "mantap")) {
    return [
      "Sama-sama! Senang bisa bantu.",
      "",
      ">> Teruslah penasaran, karena penasaran itu awal dari pintar.",
      ">> Sampai jumpa di pertanyaan berikutnya!",
    ].join("\n");
  }
  if (ada("topik", "bisa apa", "bantuan", "help")) {
    return [
      "Topik yang aku kuasai:",
      "- Apa itu AI dan kecerdasan buatan",
      "- Machine learning dan neural network",
      "- AI generatif (ChatGPT dkk)",
      "- Data dan prompt",
      "- Etika AI, hoaks, deepfake, privasi",
      "- Karier di dunia AI",
      "",
      ">> Ketik /kuis untuk uji kemampuanmu juga ya!",
    ].join("\n");
  }
  return null;
}

function offlineReply(history: { role: "user" | "assistant"; content: string }[]): string {
  const nilai = nilaiKuis(history);
  if (nilai) return nilai;

  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content.toLowerCase() ?? "";

  if (lastUser.includes("/kuis")) {
    return ["Oke! Kuis AI dimulai. 5 soal, jawab dengan A/B/C/D.\n", tampilkanSoal(1)].join("\n");
  }

  if (lastUser.includes("/bantuan") || lastUser.includes("/topik") || lastUser.includes("/tentang")) {
    return offlineReply([{ role: "user", content: "topik" }]);
  }

  const jawaban = cariJawaban([lastUser]);
  if (jawaban) return jawaban;

  return [
    "Hmm, otak AI penuhku belum terpasang di server ini (butuh kunci API).",
    "Tapi Mode Dasar tetap bisa bantu kamu!",
    "",
    ">> Ketik /topik : jelajahi topik AI",
    ">> Ketik /kuis : uji pengetahuanmu",
    "",
    ">> Coba tanya dengan kata kunci, misal: 'apa itu AI' atau 'apa itu machine learning'",
  ].join("\n");
}

/* ================= VALIDASI & ENDPOINT ================= */

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
}

function bersihkanHistory(raw: IncomingMessage[]) {
  return raw
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: (m.content as string).slice(0, 2000),
    }))
    .slice(-12);
}

export async function GET() {
  const mode = buildProviderConfig() ? "ai" : "offline";
  return NextResponse.json({ success: true, name: "Nala Chatbot", version: "1.0.0", mode });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const raw = Array.isArray((body as { messages?: IncomingMessage[] })?.messages)
      ? ((body as { messages: IncomingMessage[] }).messages)
      : [];

    const history = bersihkanHistory(raw);
    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return NextResponse.json(
        { success: false, error: "Pesan tidak valid. Tulis pertanyaanmu dulu ya." },
        { status: 400 }
      );
    }

    const aiReply = await askAI(history);
    if (aiReply) {
      return NextResponse.json({ success: true, reply: aiReply, mode: "ai" });
    }

    return NextResponse.json({ success: true, reply: offlineReply(history), mode: "offline" });
  } catch (error) {
    console.error("[nala] chat error:", error);
    return NextResponse.json(
      { success: false, error: "Server Nala sedang bermasalah. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
