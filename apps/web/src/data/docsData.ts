export interface DocTopic {
  id: string;
  category: "guide" | "cli" | "faq" | "architecture";
  title: {
    en: string;
    id: string;
  };
  summary: {
    en: string;
    id: string;
  };
  content: {
    en: string;
    id: string;
  };
}

export const COMPARISON_DATA = [
  {
    feature: {
      en: "Multi-Threaded HTTP Chunking",
      id: "Pemisahan Chunk HTTP Multi-Thread",
    },
    browser: { en: "Single stream", id: "1 koneksi tunggal" },
    traditional: { en: "4 to 8 connections", id: "4 sampai 8 koneksi" },
    downnux: { en: "Up to 32 parallel connections", id: "Hingga 32 koneksi paralel" },
  },
  {
    feature: {
      en: "Crash and Power Loss Recovery",
      id: "Pemulihan Crash & Mati Listrik",
    },
    browser: { en: "Fails and restarts from 0%", id: "Gagal dan mengulang dari 0%" },
    traditional: { en: "Basic file markers", id: "Marker file standar" },
    downnux: { en: "SQLite Write-Ahead Logging (WAL)", id: "SQLite Write-Ahead Logging (WAL)" },
  },
  {
    feature: {
      en: "Media Sniffer and Transcoder",
      id: "Pendeteksi Media & Transcoder",
    },
    browser: { en: "None", id: "Tidak ada" },
    traditional: { en: "Separate extension / CLI", id: "Ekstensi pihak ketiga terpisah" },
    downnux: { en: "Built-in extension with H.264 Safe Preset", id: "Terintegrasi dengan Preset Aman H.264" },
  },
  {
    feature: {
      en: "Progress Monitoring",
      id: "Pemantau Progres Unduhan",
    },
    browser: { en: "Browser tab / bar", id: "Tab atau bar browser" },
    traditional: { en: "Main application window", id: "Jendela utama aplikasi" },
    downnux: { en: "Detached floating inspector with chunk grid", id: "Jendela melayang terpisah dengan peta 32-segmen" },
  },
  {
    feature: {
      en: "Background Service Architecture",
      id: "Arsitektur Layanan Latar Belakang",
    },
    browser: { en: "Stops when browser closes", id: "Berhenti saat browser ditutup" },
    traditional: { en: "System tray only", id: "Ikon tray sistem saja" },
    downnux: { en: "Independent system daemon (systemd --user)", id: "Daemon sistem independen (systemd --user)" },
  },
  {
    feature: {
      en: "BitTorrent and Magnet Engine",
      id: "Mesin BitTorrent dan Magnet",
    },
    browser: { en: "Not supported", id: "Tidak didukung" },
    traditional: { en: "Requires external torrent client", id: "Memerlukan aplikasi torrent lain" },
    downnux: { en: "Native .torrent import and DHT discovery", id: "Impor langsung file .torrent dan pencarian DHT" },
  },
];

export const CLI_COMMANDS = [
  {
    command: "downnux ping",
    desc: {
      en: "Query daemon status, active PID, protocol version, and underlying hybrid engine versions.",
      id: "Mengecek status daemon, PID aktif, versi protokol, dan versi engine hybrid.",
    },
    output: "{\n  version: '0.0.5',\n  protocol: 1,\n  pid: 23394,\n  engine: { name: 'hybrid(aria2+yt-dlp)', version: '1.37.0 + yt-dlp' }\n}",
  },
  {
    command: "downnux add <URL> -c 16 -d ~/Downloads",
    desc: {
      en: "Enqueue a download with 16 parallel connections and a custom destination directory.",
      id: "Menambahkan unduhan dengan 16 koneksi paralel ke folder tujuan kustom.",
    },
    output: "✓ Task created: 8f9b2c14 (Downloading · 16 connections)",
  },
  {
    command: "downnux ls",
    desc: {
      en: "Print a compact table of all active, queued, paused, and completed downloads.",
      id: "Menampilkan tabel ringkas semua unduhan aktif, antrean, dijeda, dan selesai.",
    },
    output: "ID        STATUS       PROGRESS  SPEED       FILE\n8f9b2c14  downloading  42.5%     14.8 MB/s   archive_2026.zip\n3a110d92  paused       18.0%     0 B/s       linux_kernel.iso",
  },
  {
    command: "downnux pause <ID>",
    desc: {
      en: "Pause an ongoing task and write current byte offsets atomically into SQLite WAL storage.",
      id: "Menjeda unduhan aktif dan menyimpan posisi byte secara aman ke penyimpanan SQLite WAL.",
    },
    output: "✓ Task 8f9b2c14 paused. Byte offset committed to WAL.",
  },
  {
    command: "downnux resume <ID>",
    desc: {
      en: "Resume a paused or interrupted download instantly using HTTP Range headers.",
      id: "Melanjutkan unduhan yang dijeda atau terputus seketika menggunakan HTTP Range.",
    },
    output: "✓ Task 8f9b2c14 resumed with 16 Range connections.",
  },
];

export const FAQ_LIST = [
  {
    q: {
      en: "Why do downloads continue running even after closing the main window?",
      id: "Mengapa unduhan tetap berjalan saat jendela utama ditutup?",
    },
    a: {
      en: "DownNux Manager decouples the interface from the execution engine. Downloads run inside a background system service (such as systemd on Linux). The graphical interface is a client that can be opened or closed at any time without disturbing active network transfers.",
      id: "DownNux Manager memisahkan antarmuka dari mesin eksekusi. Unduhan berjalan di dalam layanan latar belakang sistem (seperti systemd di Linux). Antarmuka grafis berfungsi sebagai klien yang bebas dibuka atau ditutup tanpa mengganggu proses transfer jaringan yang sedang aktif.",
    },
  },
  {
    q: {
      en: "How does DownNux ensure downloaded videos play reliably on WhatsApp and Gmail?",
      id: "Bagaimana DownNux memastikan video yang diunduh dapat dibuka lancar di WhatsApp dan Gmail?",
    },
    a: {
      en: "Starting in version 0.0.5, video downloads enforce the widely-supported H.264 video codec, AAC audio codec, and the faststart container flag. This places the container metadata at the beginning of the file, allowing messaging apps and web previewers to stream the file immediately without corruption errors.",
      id: "Mulai versi 0.0.5, unduhan video otomatis menggunakan format standar H.264, audio AAC, dan flag faststart pada kontainer MP4. Hal ini menempatkan metadata di bagian awal file sehingga aplikasi pesan singkat dan web previewer dapat langsung memutar video tanpa kendala format rusak.",
    },
  },
  {
    q: {
      en: "Where can I find downloads that have been paused?",
      id: "Di mana saya dapat menemukan file unduhan yang sedang dijeda?",
    },
    a: {
      en: "Paused downloads remain visible in the main download table. You can filter them quickly by clicking the Paused item in the left sidebar library or by selecting the Active subtab in the top bar.",
      id: "File yang dijeda tetap tersimpan rapi di daftar unduhan. Anda dapat melihatnya melalui menu Paused pada bilah samping kiri atau memilih sub-tab Active di bar atas.",
    },
  },
  {
    q: {
      en: "How do I import a .torrent file or Magnet link?",
      id: "Bagaimana cara mengimpor file .torrent atau Magnet link?",
    },
    a: {
      en: "Click the Open Torrent button on the top toolbar to browse for a .torrent file, or click + Add URL and paste any magnet link starting with magnet:?xt=. You can also drag and drop a .torrent file directly into the application window.",
      id: "Klik tombol Open Torrent pada toolbar atas untuk memilih file .torrent, atau klik + Add URL lalu tempel Magnet link berawalan magnet:?xt=. Anda juga bisa langsung menyeret file .torrent ke dalam jendela aplikasi.",
    },
  },
];
