/* ===== Helper umum ===== */
const $ = (s, r = document) => r.querySelector(s);
const page = document.body.dataset.page;
const user = JSON.parse(sessionStorage.getItem("user") || "null");
const rupiah = n => "Rp " + Number(n).toLocaleString("id-ID");
const angka = teks => parseInt(String(teks).replace(/\D/g, ""), 10) || 0;
const simpan = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const ambil = (k, d) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));

function toast(pesan) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = pesan; t.setAttribute("role", "status");
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// Modal box memakai elemen <dialog>
function bukaModal(judul, isiHTML, onSubmit) {
  const d = document.createElement("dialog");
  d.className = "modal";
  d.innerHTML = `<h2>${judul}</h2><form novalidate>${isiHTML}
    <div class="aksi"><button type="button" class="link" data-tutup>Batal</button>
    <button type="submit" class="btn">Kirim</button></div></form>`;
  document.body.appendChild(d);
  d.showModal();
  d.querySelector("[data-tutup]").onclick = () => d.close();
  d.addEventListener("close", () => d.remove());
  d.querySelector("form").addEventListener("submit", e => {
    e.preventDefault();
    if (onSubmit(d.querySelector("form")) !== false) d.close();
  });
}

// Validasi: tandai field kosong + pesan error di bawahnya
function cekWajib(form) {
  let valid = true;
  form.querySelectorAll("[required]").forEach(el => {
    el.classList.remove("invalid");
    el.parentElement.querySelector(".err-msg")?.remove();
    if (!el.value.trim() || !el.checkValidity()) {
      valid = false;
      el.classList.add("invalid");
      const p = document.createElement("p");
      p.className = "err-msg"; p.textContent = "Isian ini wajib diisi dengan benar.";
      el.after(p);
    }
  });
  return valid;
}

/* ===== Guard login + navbar ===== */
if (page !== "login") {
  if (!user) location.href = "index.html";
  else {
    const menu = [["dashboard.html", "Dashboard", "dashboard"], ["stok.html", "Stok", "stok"],
      ["checkout.html", "Pemesanan", "checkout"], ["tracking.html", "Tracking", "tracking"]];
    $("#navbar").innerHTML = `<a class="brand" href="dashboard.html">Toko Buku UT</a>` +
      menu.map(m => `<a href="${m[0]}" class="${m[2] === page ? "aktif" : ""}">${m[1]}</a>`).join("") +
      `<span>${user.nama} (${user.role})</span><button id="btnKeluar">Keluar</button>`;
    $("#btnKeluar").onclick = () => { sessionStorage.removeItem("user"); location.href = "index.html"; };
  }
}

/* ===== 1. Login ===== */
function initLogin() {
  $("#formLogin").addEventListener("submit", e => {
    e.preventDefault();
    const email = $("#email").value.trim(), pass = $("#password").value;
    const u = dataPengguna.find(x => x.email === email && x.password === pass);
    if (!u) return alert("Email/password yang anda masukkan salah");
    sessionStorage.setItem("user", JSON.stringify(u));
    location.href = "dashboard.html";
  });
  $("#btnLupa").onclick = () => bukaModal("Lupa password",
    `<label for="lEmail">Email terdaftar</label><input id="lEmail" type="email" required>`,
    f => {
      if (!cekWajib(f)) return false;
      const ada = dataPengguna.some(x => x.email === $("#lEmail").value.trim());
      alert(ada ? "Tautan reset password telah dikirim ke email Anda (simulasi)." : "Email tidak terdaftar.");
    });
  $("#btnDaftar").onclick = () => bukaModal("Daftar akun",
    `<label for="rNama">Nama</label><input id="rNama" required>
     <label for="rEmail">Email</label><input id="rEmail" type="email" required>
     <label for="rPass">Password (min. 6 karakter)</label><input id="rPass" type="password" minlength="6" required>`,
    f => {
      if (!cekWajib(f)) return false;
      const email = $("#rEmail").value.trim();
      if (dataPengguna.some(x => x.email === email)) { alert("Email sudah terdaftar."); return false; }
      dataPengguna.push({ id: dataPengguna.length + 1, nama: $("#rNama").value.trim(), email, password: $("#rPass").value, role: "User" });
      alert("Pendaftaran berhasil. Silakan login.");
    });
}

/* ===== 2. Dashboard ===== */
function initDashboard() {
  const jam = new Date().getHours();
  const sapa = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
  $("#greeting").textContent = `${sapa}, ${user.nama}!`;
  $("#jam").textContent = new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });
}

/* ===== 3. Stok ===== */
function tambahBaris(b) {
  const tr = document.createElement("tr");
  const isi = [b.kodeBarang, b.namaBarang, b.jenisBarang, b.edisi, b.stok, b.harga];
  const img = document.createElement("td");
  img.innerHTML = b.cover ? `<img src="${b.cover}" alt="Cover ${b.namaBarang}">` : "-";
  tr.appendChild(img);
  isi.forEach(v => { const td = document.createElement("td"); td.textContent = v; tr.appendChild(td); });
  const aksi = document.createElement("td");
  const pesan = document.createElement("button");
  pesan.className = "btn-sm"; pesan.textContent = "Pesan";
  pesan.onclick = () => {
    const k = ambil("keranjang", []);
    const ada = k.find(x => x.kode === b.kodeBarang);
    ada ? ada.qty++ : k.push({ kode: b.kodeBarang, nama: b.namaBarang, harga: angka(b.harga), qty: 1 });
    simpan("keranjang", k);
    toast(`"${b.namaBarang}" masuk keranjang`);
  };
  aksi.appendChild(pesan); tr.appendChild(aksi);
  $("#tabelStok tbody").appendChild(tr);
}
function initStok() {
  dataKatalogBuku.forEach(tambahBaris);
  $("#formStok").addEventListener("submit", e => {
    e.preventDefault();
    if (!cekWajib(e.target)) return;
    if (dataKatalogBuku.some(b => b.kodeBarang === $("#kode").value.trim().toUpperCase()))
      return alert("Kode barang sudah ada di katalog.");
    const b = {
      kodeBarang: $("#kode").value.trim().toUpperCase(), namaBarang: $("#nama").value.trim(),
      jenisBarang: $("#jenis").value.trim(), edisi: $("#edisi").value, stok: Number($("#stok").value),
      harga: rupiah($("#harga").value), cover: ""
    };
    dataKatalogBuku.push(b); tambahBaris(b);
    e.target.reset(); $("#jenis").value = "Buku Ajar";
    toast("Stok baru ditambahkan");
  });
}

/* ===== 4. Tracking ===== */
const PROGRES = { "Dalam Perjalanan": 60, "Dikirim": 100 };
function initTracking() {
  $("#formCari").addEventListener("submit", e => {
    e.preventDefault();
    const hasil = $("#hasil"), no = $("#nomorDO").value.trim();
    if (!cekWajib(e.target)) return;
    const d = dataTracking[no];
    if (!d) { hasil.hidden = true; return alert("Nomor Delivery Order tidak ditemukan."); }
    const p = PROGRES[d.status] ?? 30, selesai = p === 100 ? "selesai" : "";
    const urut = [...d.perjalanan].sort((a, b) => a.waktu.localeCompare(b.waktu));
    hasil.hidden = false;
    hasil.innerHTML = `<h2>Pesanan atas nama ${d.nama}</h2>
      <span class="badge ${selesai}">${d.status}</span>
      <div class="progress ${selesai}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p}%"></span></div>
      <dl class="detail"><dt>No. DO</dt><dd>${d.nomorDO}</dd><dt>Ekspedisi</dt><dd>${d.ekspedisi}</dd>
      <dt>Tanggal kirim</dt><dd>${d.tanggalKirim}</dd><dt>Jenis paket</dt><dd>${d.paket}</dd>
      <dt>Total bayar</dt><dd>${d.total}</dd></dl>
      <h2>Riwayat perjalanan</h2>
      <ul class="timeline">${urut.map(x => `<li><time>${x.waktu}</time>${x.keterangan}</li>`).join("")}</ul>`;
  });
}

/* ===== 5. Checkout ===== */
function renderKeranjang() {
  const k = ambil("keranjang", []), tb = $("#tabelKeranjang tbody");
  tb.innerHTML = "";
  if (!k.length) tb.innerHTML = `<tr><td colspan="5">Keranjang kosong. Pilih buku di halaman Stok.</td></tr>`;
  k.forEach((it, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${it.nama}</td><td>${rupiah(it.harga)}</td>
      <td><input type="number" min="1" value="${it.qty}" aria-label="Jumlah ${it.nama}"></td>
      <td>${rupiah(it.harga * it.qty)}</td><td><button class="btn-sm btn-del">Hapus</button></td>`;
    tr.querySelector("input").onchange = e => { k[i].qty = Math.max(1, +e.target.value || 1); simpan("keranjang", k); renderKeranjang(); };
    tr.querySelector("button").onclick = () => { k.splice(i, 1); simpan("keranjang", k); renderKeranjang(); };
    tb.appendChild(tr);
  });
  $("#total").textContent = rupiah(k.reduce((s, x) => s + x.harga * x.qty, 0));
}
function renderRiwayat() {
  const r = ambil("riwayat", []), tb = $("#tabelRiwayat tbody");
  tb.innerHTML = r.length ? "" : `<tr><td colspan="6">Belum ada transaksi.</td></tr>`;
  r.forEach(x => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${x.no}</td><td>${x.tanggal}</td><td>${x.nama}</td><td>${x.item}</td><td>${rupiah(x.total)}</td><td>${x.metode}</td>`;
    tb.appendChild(tr);
  });
}
function initCheckout() {
  $("#cNama").value = user.nama; $("#cEmail").value = user.email;
  renderKeranjang(); renderRiwayat();
  $("#formCheckout").addEventListener("submit", e => {
    e.preventDefault();
    const k = ambil("keranjang", []);
    if (!k.length) return alert("Keranjang masih kosong.");
    if (!cekWajib(e.target)) return alert("Mohon lengkapi data pemesan dan pembayaran.");
    if (!/^[0-9]{9,14}$/.test($("#cTelp").value.trim())) return alert("No. telepon harus 9-14 digit angka.");
    const r = ambil("riwayat", []), no = String(20230014 + r.length);
    r.unshift({ no, tanggal: new Date().toLocaleDateString("id-ID"), nama: $("#cNama").value.trim(),
      item: k.map(x => `${x.nama} (${x.qty})`).join(", "), total: k.reduce((s, x) => s + x.harga * x.qty, 0), metode: $("#cMetode").value });
    simpan("riwayat", r); simpan("keranjang", []);
    renderKeranjang(); renderRiwayat(); e.target.reset();
    $("#cNama").value = user.nama; $("#cEmail").value = user.email;
    alert(`Pesanan berhasil dibuat. Nomor DO Anda: ${no}`);
  });
}

({ login: initLogin, dashboard: initDashboard, stok: initStok, tracking: initTracking, checkout: initCheckout })[page]?.();
