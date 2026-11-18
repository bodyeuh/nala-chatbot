'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'

type Role = 'nala' | 'user' | 'system'

interface Msg {
  id: number
  role: Role
  text: string
  full: string
}

const ASCII_LOGO = String.raw` _   _    _    _        _       ____ _   _    _  _____ ____   ___ _____
| \ | |  / \  | |      / \     / ___| | | |  / \|_   _| __ ) / _ \_   _|
|  \| | / _ \ | |     / _ \   | |   | |_| | / _ \ | | |  _ \| | | || |
| |\  |/ ___ \| |___ / ___ \  | |___|  _  |/ ___ \| | | |_) | |_| || |
|_| \_/_/   \_\_____/_/   \_\  \____|_| |_/_/   \_\_| |____/ \___/ |_|`

const TICK_MS = 12
const CHARS_PER_TICK = 3

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const BOOT_LINES: { role: Role; text: string; delay: number }[] = [
  { role: 'system', text: '[BOOT] NALA OS v1.0 — Terminal Belajar AI SMP Budi Mulia Karawang', delay: 250 },
  { role: 'system', text: '[BOOT] Memuat modul pengetahuan AI ............ [OK]', delay: 450 },
  { role: 'system', text: '[BOOT] Menghubungkan otak digital ............. [OK]', delay: 500 },
  { role: 'system', text: '[BOOT] Kalibrasi bahasa Indonesia ............. [OK]', delay: 400 },
  { role: 'system', text: '[BOOT] Semua sistem siap. Selamat belajar!', delay: 350 },
]

const WELCOME = [
  'Halo! Aku Nala, teman belajar AI kamu.',
  '',
  'Aku bisa bantu kamu mengenal kecerdasan buatan (AI)',
  'dengan bahasa sederhana dan contoh sehari-hari.',
  '',
  '>> Ketik pertanyaan apa pun tentang AI',
  '>> Coba perintah: /topik  /kuis  /bantuan',
].join('\n')

const HELP_TEXT = [
  'DAFTAR PERINTAH:',
  '>> /topik     : lihat daftar topik AI',
  '>> /kuis      : main kuis AI bareng Nala',
  '>> /tentang   : kenalan dengan Nala',
  '>> /bersihkan : hapus seluruh layar',
  '>> /bantuan   : tampilkan daftar ini',
  '',
  'Atau langsung ketik pertanyaanmu, misal:',
  '"apa itu AI?", "contoh AI di kehidupan sehari-hari"',
].join('\n')

const TOPIK_TEXT = [
  'DAFTAR TOPIK AI:',
  '[1] Apa itu kecerdasan buatan (AI)?',
  '[2] Machine learning = mesin belajar dari data',
  '[3] Neural network = otak digital',
  '[4] AI generatif (ChatGPT dan temannya)',
  '[5] Data: makanan utama AI',
  '[6] Prompt: cara ngobrol yang benar dengan AI',
  '[7] Etika AI: hoaks, deepfake, privasi',
  '[8] Karier seru di dunia AI',
  '',
  '>> Tinggal ketik, misal: "jelaskan apa itu AI"',
].join('\n')

const TENTANG_TEXT = [
  'NALA v1.0 — Teman Belajar AI',
  '',
  'Aku chatbot yang dibuat khusus untuk',
  'siswa SMP Budi Mulia Karawang.',
  'Misi aku: bikin kamu paham kecerdasan buatan (AI)',
  'pakai bahasa sederhana, contoh sehari-hari,',
  'dan sedikit humor di sela-selanya.',
  '',
  'Tidak ada pertanyaan yang terlalu bodoh untuk ditanya.',
  'Mulai saja: ketik "apa itu AI" sekarang!',
].join('\n')

const CLEAR_NOTE = '[SISTEM] Layar dibersihkan. Siap belajar lagi!'
const UNKNOWN_CMD = '[SISTEM] Perintah tidak dikenali. Ketik /bantuan untuk melihat daftar perintah.'
const ERROR_TEXT = ['[ERROR] Koneksi ke otak Nala terputus.', 'Coba kirim ulang pesanmu ya.'].join('\n')

const CHIPS = ['/bantuan', '/topik', '/kuis', '/tentang', '/bersihkan'] as const

function MsgRow({ msg }: { msg: Msg }) {
  if (msg.role === 'system') {
    return <p className="whitespace-pre-wrap text-[#5f8f6a]">{msg.text}</p>
  }
  if (msg.role === 'user') {
    return (
      <p className="whitespace-pre-wrap break-words">
        <span className="glow-amber font-bold text-[#ffb000]">nala@siswa:~$ </span>
        <span className="text-[#f2fff4]">{msg.text}</span>
      </p>
    )
  }
  const typing = msg.text.length < msg.full.length
  return (
    <p className="whitespace-pre-wrap break-words">
      <span className="glow-green font-bold text-[#3dff7c]">[NALA] </span>
      <span className="text-[#bfe9c8]">{msg.text}</span>
      {typing && <span className="blink-cursor ml-0.5 inline-block text-[#3dff7c]">_</span>}
    </p>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [apiBusy, setApiBusy] = useState(false)
  const [booted, setBooted] = useState(false)
  const [aiMode, setAiMode] = useState<'memuat' | 'ai' | 'offline'>('memuat')

  const messagesRef = useRef<Msg[]>([])
  const idRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const animatingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateMessages = useCallback((fn: (prev: Msg[]) => Msg[]) => {
    // Hitung dari ref agar sinkron secara langsung (ref = cerminan state terbaru)
    messagesRef.current = fn(messagesRef.current)
    setMessages(messagesRef.current)
  }, [])

  const animate = useCallback(
    (id: number, full: string) =>
      new Promise<void>((resolve) => {
        animatingRef.current = true
        let i = 0
        const step = () => {
          i = Math.min(full.length, i + CHARS_PER_TICK)
          const shown = full.slice(0, i)
          updateMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: shown } : m)))
          if (i < full.length) {
            timerRef.current = window.setTimeout(step, TICK_MS)
          } else {
            animatingRef.current = false
            timerRef.current = null
            resolve()
          }
        }
        step()
      }),
    [updateMessages]
  )

  const pushMsg = useCallback(
    (role: Role, full: string) => {
      const id = ++idRef.current
      // Pesan user/system langsung tampil penuh; hanya pesan Nala yang dianimasikan
      updateMessages((prev) => [...prev, { id, role, text: role === 'nala' ? '' : full, full }])
      return id
    },
    [updateMessages]
  )

  // Urutan boot saat halaman pertama kali dibuka
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      for (const line of BOOT_LINES) {
        await sleep(line.delay)
        if (cancelled) return
        pushMsg(line.role, line.text)
      }
      if (cancelled) return
      const id = pushMsg('nala', WELCOME)
      await animate(id, WELCOME)
      if (!cancelled) {
        setBooted(true)
        inputRef.current?.focus()
      }
    }
    run()
    return () => {
      cancelled = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [animate, pushMsg])

  // Tanyakan status mode AI ke server (AI penuh / Mode Dasar)
  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d: { mode?: string }) => setAiMode(d?.mode === 'ai' ? 'ai' : 'offline'))
      .catch(() => setAiMode('offline'))
  }, [])

  // Auto-scroll ke bawah setiap ada pesan baru
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, apiBusy])

  const doSend = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || !booted || apiBusy || animatingRef.current) return

      setInput('')
      pushMsg('user', text)

      // Perintah lokal (tidak butuh AI)
      if (text === '/bersihkan') {
        updateMessages(() => [])
        pushMsg('system', CLEAR_NOTE)
        return
      }
      if (text === '/bantuan') {
        await animate(pushMsg('nala', HELP_TEXT), HELP_TEXT)
        return
      }
      if (text === '/topik') {
        await animate(pushMsg('nala', TOPIK_TEXT), TOPIK_TEXT)
        return
      }
      if (text === '/tentang') {
        await animate(pushMsg('nala', TENTANG_TEXT), TENTANG_TEXT)
        return
      }
      if (text.startsWith('/') && text !== '/kuis') {
        pushMsg('system', UNKNOWN_CMD)
        return
      }

      // Obrolan lewat AI (termasuk /kuis)
      setApiBusy(true)
      try {
        const history = messagesRef.current
          .filter((m) => m.role === 'user' || m.role === 'nala')
          .map((m) => ({
            role: m.role === 'nala' ? ('assistant' as const) : ('user' as const),
            content: (m.full || m.text).trim(),
          }))
          .filter((m) => m.content.length > 0)
          .slice(-12)

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        })
        const data = (await res.json().catch(() => null)) as { success?: boolean; reply?: string; mode?: string } | null

        if (!res.ok || !data?.success || typeof data.reply !== 'string' || !data.reply.trim()) {
          throw new Error('bad response')
        }

        if (data.mode === 'ai' || data.mode === 'offline') setAiMode(data.mode)

        const reply = data.reply
        await animate(pushMsg('nala', reply), reply)
      } catch {
        pushMsg('system', ERROR_TEXT)
      } finally {
        setApiBusy(false)
        inputRef.current?.focus()
      }
    },
    [animate, booted, apiBusy, pushMsg, updateMessages]
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void doSend(input)
  }
  const locked = !booted || apiBusy || animatingRef.current
  return (
    <main className="crt screen-flicker min-h-dvh bg-[#050805] p-2 font-mono text-[#bfe9c8] sm:p-4 md:p-6">
      <div className="mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#1e3a1e] bg-[#070d07] shadow-[0_0_50px_rgba(61,255,124,0.07)] sm:h-[calc(100dvh-2rem)] md:h-[calc(100dvh-3rem)]">
        {/* Bilah judul jendela terminal */}
        <div className="flex items-center gap-2 border-b border-[#1e3a1e] bg-[#0a120a] px-3 py-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-[#ffb000]" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-[#3dff7c]" aria-hidden="true" />
          <span className="ml-2 truncate text-xs text-[#5f8f6a]">nala@ai:~/belajar-ai — Terminal Belajar AI</span>
          <span className="ml-auto hidden text-xs text-[#5f8f6a] sm:block">v1.0</span>
        </div>

        {/* Kepala terminal dengan logo ASCII */}
        <header className="border-b border-[#1e3a1e] px-3 py-3 sm:px-4">
          <pre
            className="glow-green hidden overflow-x-auto text-[10px] leading-tight text-[#3dff7c] sm:block md:text-xs"
            aria-hidden="true"
          >
            {ASCII_LOGO}
          </pre>
          <p className="glow-green text-lg font-bold tracking-wide text-[#3dff7c] sm:hidden">NALA CHATBOT</p>
          <p className="mt-1 text-[11px] text-[#5f8f6a] sm:text-xs">
            Chatbot belajar AI untuk Siswa SMP Budi Mulia Karawang
          </p>
          <p className="text-[11px] text-[#5f8f6a] sm:text-xs">
            ketik <span className="text-[#ffb000]">/bantuan</span> untuk panduan
          </p>
        </header>

        {/* Ruang pesan */}
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Ruang obrolan dengan Nala"
          className="terminal-scroll flex-1 space-y-3 overflow-y-auto px-3 py-3 text-[13px] leading-relaxed sm:px-4 sm:text-sm"
        >
          {messages.map((m) => (
            <MsgRow key={m.id} msg={m} />
          ))}
          {apiBusy && (
            <p className="animate-pulse text-[#5f8f6a]">
              <span className="font-bold text-[#3dff7c]">[NALA] </span>menghubungkan ke otak AI...
            </p>
          )}
        </div>

        {/* Perintah cepat */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#1e3a1e] bg-[#0a120a] px-3 py-2 sm:px-4">
          <span className="text-[11px] text-[#5f8f6a] sm:text-xs">PERINTAH CEPAT:</span>
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => void doSend(c)}
              disabled={locked}
              aria-label={`Jalankan perintah ${c}`}
              className="rounded-sm border border-[#2d5a2d] px-2 py-1 text-[11px] text-[#3dff7c] transition-colors hover:bg-[#3dff7c] hover:text-[#050805] focus-visible:bg-[#3dff7c] focus-visible:text-[#050805] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
            >
              {c}
            </button>
          ))}
        </div>

        {/* Area ketik */}
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-t border-[#1e3a1e] bg-[#0a120a] px-3 py-3 sm:px-4"
        >
          <label htmlFor="terminal-input" className="glow-amber shrink-0 text-xs font-bold text-[#ffb000] sm:text-sm">
            nala@siswa:~$
          </label>
          <input
            ref={inputRef}
            id="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="tulis pertanyaanmu tentang AI di sini..."
            autoComplete="off"
            spellCheck={false}
            maxLength={500}
            aria-label="Ketik pertanyaan untuk Nala"
            className="min-w-0 flex-1 bg-transparent text-base text-[#f2fff4] caret-[#3dff7c] placeholder:text-[#3a5a40] focus:outline-none sm:text-sm"
          />
          <button
            type="submit"
            disabled={locked || !input.trim()}
            className="shrink-0 rounded-sm border border-[#3dff7c] px-3 py-1.5 text-xs font-bold text-[#3dff7c] transition-colors hover:bg-[#3dff7c] hover:text-[#050805] focus-visible:bg-[#3dff7c] focus-visible:text-[#050805] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            KIRIM ▸
          </button>
        </form>

        {/* Bilah status bawah */}
        <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#1e3a1e] bg-[#0a120a] px-3 py-1.5 text-[10px] text-[#5f8f6a] sm:px-4 sm:text-[11px]">
          <span>
            <span className="text-[#3dff7c]">●</span> AI: {apiBusy ? 'BERPIKIR' : aiMode === 'ai' ? 'ONLINE' : aiMode === 'memuat' ? 'MEMUAT' : 'MODE DASAR'}
          </span>
          <span>MODE: BELAJAR</span>
          <span className="hidden sm:inline">UNTUK: SMP BUDI MULIA KARAWANG</span>
          <span>NALA v1.0</span>
        </footer>
      </div>
    </main>
  )
}
