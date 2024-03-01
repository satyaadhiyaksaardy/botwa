async function handleHelp(msg) {
  msg.reply(
    `Wassup, bro! Ini daftar perintah yang bisa loe pake:
  
      - *Nyatet Kerjaan*:
      - /!kerjaan add [tugas]: Nambahin tugas baru nih.
      - /!kerjaan list: Liat daftar tugas yang ada.
      - /!kerjaan delete [nomor]: Hapus tugas yang udah selesai atau salah input.
    
    - *Catet Pengeluaran*:
      - /!pengeluaran add [nama] | [jumlah]: Catet pengeluaran baru.
      - /!pengeluaran list: Intip daftar pengeluaran lo.
      - /!pengeluaran delete [nomor]: Salah catet? Hapus aja.
      - /!pengeluaran summary: Cek total pengeluaran lo.
      - /!pengeluaran insight: Dapetin insight pengeluaran lo.
    
    - *Pengingat*:
      - /!ingetin [hh:mm] [pesan]: Setel pengingat biar gak lupa.
    
    - *Interaksi Chat*:
      - /!gpt [pesan]: Ngobrol yuk sama bot.
      - /!gpt reset: Reset obrolan, mulai dari awal lagi.
    
    - *Notulensi Diskusi Di Grub*:
      - /!startlistening: Mulai catet obrolan chat.
      - /!stoplistening: Berhenti dengerin dan rangkum obrolan.
    
    - *Mode Admin*:
      - /!adminmode: Nyalain/matikan mode admin (khusus user tertentu).
    
    - *Bikin Stiker*:
      - /!sticker: Bikin stiker dari gambar.
    
    - *Transkripsi Audio*:
      - /!transcribe: Ubah pesan suara jadi teks.
    
    - *Info CCTV*:
      - /!ingfo: Dapetin gambar terbaru dari CCTV.
    
    - *Info Cuaca*:
      - /!ingfo-cuaca: Cek info cuaca terkini.
    
    - *Manajemen Grup*:
      - /!add-group [GroupChatID] [SpreadsheetURL]: Tambahin anggota ke grup dari spreadsheet.
    
    - *Dapetin Chat ID*:
      - /!chat-id: Nyari tau ID chat.
      
    - *Broadcast*:
      - /!broadcast [SpreadsheetURL]: Kirim pesan ke banyak nomor.
  
  Paijo siap membantu loe! Jangan sungkan buat tanya apa aja, ok?`
  );
}

module.exports = { handleHelp };
