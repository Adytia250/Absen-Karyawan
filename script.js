const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const btnEnroll = document.getElementById('btnEnroll');
const btnAbsenMasuk = document.getElementById('btnAbsenMasuk');
const btnAbsenPulang = document.getElementById('btnAbsenPulang');
const btnLihatDaftarWajah = document.getElementById('btnLihatDaftarWajah');
const btnHapusDaftarWajah = document.getElementById('btnHapusDaftarWajah');
const enrollForm = document.getElementById('enrollForm');
const btnAmbilWajah = document.getElementById('btnAmbilWajah');
const btnBatalEnroll = document.getElementById('btnBatalEnroll');
const namaKaryawan = document.getElementById('namaKaryawan');
const logDiv = document.getElementById('log');
const absensiLog = document.getElementById('absensiLog');
const warningDiv = document.getElementById('warning');
const btnHapusLog = document.getElementById('btnHapusLog');
const listWajahDiv = document.getElementById('listWajah');
const csvLinkDiv = document.getElementById('csvLink');

// SheetDB Google Sheet endpoint
const SHEETDB_URL = "https://sheetdb.io/api/v1/3ynd2m0gmckrf";
const bulanArr = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

let modelsLoaded = false;

async function loadModels() {
  warningDiv.textContent = "Loading models...";
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  modelsLoaded = true;
  warningDiv.textContent = "";
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (e) {
    warningDiv.textContent = "Tidak dapat mengakses kamera. Izinkan akses kamera di browser.";
  }
}

function getStoredFaces() {
  return JSON.parse(localStorage.getItem('faces') || '[]');
}
function setStoredFaces(faces) {
  localStorage.setItem('faces', JSON.stringify(faces));
}
function logAbsensi(nama, jenis, verifManual = false, waktu, tanggal) {
  const logs = JSON.parse(localStorage.getItem('absensi') || '[]');
  logs.unshift({
    nama: verifManual ? nama + " (verifikasi manual)" : nama,
    waktu: waktu,
    tanggal: tanggal,
    jenis
  });
  localStorage.setItem('absensi', JSON.stringify(logs));
  generateCsvLink();
}
function tampilkanAbsensiLog() {
  const logs = JSON.parse(localStorage.getItem('absensi') || '[]');
  absensiLog.innerHTML = logs.length === 0
    ? "<b>Log Absensi:</b><br><i>Belum ada data absensi.</i>"
    : "<b>Log Absensi:</b><br>" + logs.map(l => `${l.nama} - ${l.jenis} - ${l.tanggal} ${l.waktu}`).join('<br>');
}
function tampilkanListWajah() {
  const faces = getStoredFaces();
  if (faces.length === 0) {
    listWajahDiv.innerHTML = "<i>Belum ada data wajah yang terdaftar.</i>";
  } else {
    listWajahDiv.innerHTML = "<b>Daftar Wajah Terdaftar:</b><br>" +
      faces.map((f, i) => `${i+1}. ${f.nama}`).join('<br>');
  }
}

function generateCsvLink() {
  const logs = JSON.parse(localStorage.getItem('absensi') || '[]');
  if (logs.length === 0) {
    csvLinkDiv.innerHTML = "<i>Belum ada data absensi.</i>";
    return;
  }
  let csv = "nama,tanggal,waktu,jenis\n";
  logs.forEach(row => {
    const nama = `"${row.nama.replace(/"/g, '""')}"`;
    csv += [nama, row.tanggal, row.waktu, row.jenis].join(",") + "\n";
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  csvLinkDiv.innerHTML =
    `<a href="${url}" download="absensi.csv" target="_blank">Buka/Download Absensi Excel (CSV)</a>`;
}

// ==== ENROLL WAJAH ====
btnEnroll.onclick = () => {
  enrollForm.style.display = '';
  namaKaryawan.value = '';
  namaKaryawan.focus();
  btnEnroll.disabled = true; btnAbsenMasuk.disabled = true; btnAbsenPulang.disabled = true;
  logDiv.textContent = "Masukkan nama/No KTA, lalu arahkan wajah ke kamera dan klik 'Ambil Foto & Simpan Wajah'";
};
btnBatalEnroll.onclick = () => {
  enrollForm.style.display = 'none';
  btnEnroll.disabled = false; btnAbsenMasuk.disabled = false; btnAbsenPulang.disabled = false;
  logDiv.textContent = '';
};
btnAmbilWajah.onclick = async () => {
  if (!modelsLoaded) {
    logDiv.textContent = "Model face-api belum selesai dimuat, mohon tunggu...";
    return;
  }
  const nama = namaKaryawan.value.trim();
  if (!nama) {
    logDiv.textContent = "Nama/No KTA wajib diisi.";
    namaKaryawan.focus();
    return;
  }
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  const deteksi = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
  if (!deteksi) {
    logDiv.textContent = "Wajah tidak terdeteksi, coba ulangi posisi wajah.";
    return;
  }
  const faces = getStoredFaces();
  for (let f of faces) {
    const dist = faceapi.euclideanDistance(deteksi.descriptor, f.descriptor);
    if (dist < 0.5) {
      logDiv.textContent = `Wajah sudah terdaftar atas nama: ${f.nama}`;
      enrollForm.style.display = 'none';
      btnEnroll.disabled = false; btnAbsenMasuk.disabled = false; btnAbsenPulang.disabled = false;
      tampilkanListWajah();
      return;
    }
  }
  faces.push({ nama: nama.toUpperCase(), descriptor: Array.from(deteksi.descriptor) });
  setStoredFaces(faces);
  logDiv.textContent = "Pendaftaran wajah berhasil!";
  enrollForm.style.display = 'none';
  btnEnroll.disabled = false; btnAbsenMasuk.disabled = false; btnAbsenPulang.disabled = false;
  tampilkanListWajah();
};

btnAbsenMasuk.onclick = () => absenWajah("masuk");
btnAbsenPulang.onclick = () => absenWajah("pulang");

async function absenWajah(jenis) {
  if (!modelsLoaded) {
    logDiv.textContent = "Model face-api belum selesai dimuat, mohon tunggu...";
    return;
  }
  btnEnroll.disabled = true; btnAbsenMasuk.disabled = true; btnAbsenPulang.disabled = true;
  logDiv.textContent = "Arahkan wajah ke kamera untuk absen " + jenis + "...";
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

  const now = new Date();
  const tanggal = now.getDate() + ' ' + bulanArr[now.getMonth()] + ' ' + now.getFullYear();
  const waktu = now.toLocaleTimeString('id-ID', { hour12: false });

  const deteksi = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
  if (!deteksi) {
    logDiv.textContent = "Wajah tidak terdeteksi, ulangi posisi wajah.";
    btnEnroll.disabled = false; btnAbsenMasuk.disabled = false; btnAbsenPulang.disabled = false;
    return;
  }
  const faces = getStoredFaces();
  let matchNama = null, minDist = 0.5;
  for (let f of faces) {
    const dist = faceapi.euclideanDistance(deteksi.descriptor, f.descriptor);
    if (dist < minDist) { minDist = dist; matchNama = f.nama; }
  }
  if (matchNama) {
    logAbsensi(matchNama, jenis, false, waktu, tanggal);
    tampilkanAbsensiLog();
    logDiv.textContent = `Absen ${jenis} berhasil untuk: ${matchNama}`;
    try {
      await fetch(SHEETDB_URL, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            nama: matchNama,
            waktu: waktu,
            tanggal: tanggal,
            jenis
          }]
        })
      });
      logDiv.textContent += " (Terkirim ke Google Sheets)";
    } catch (e) {
      logDiv.textContent += " (Gagal kirim ke Google Sheets)";
    }
  } else {
    const namaManual = prompt("Wajah tidak dikenali. Silakan masukkan nama karyawan/No KTA untuk verifikasi manual:");
    if (namaManual) {
      const nowManual = new Date();
      const tanggalManual = nowManual.getDate() + ' ' + bulanArr[nowManual.getMonth()] + ' ' + nowManual.getFullYear();
      const waktuManual = nowManual.toLocaleTimeString('id-ID', { hour12: false });

      logAbsensi(namaManual, jenis, true, waktuManual, tanggalManual);
      tampilkanAbsensiLog();
      logDiv.textContent = `Absen ${jenis} verifikasi manual untuk: ${namaManual}`;
      try {
        await fetch(SHEETDB_URL, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [{
              nama: namaManual + " (verifikasi manual)",
              waktu: waktuManual,
              tanggal: tanggalManual,
              jenis
            }]
          })
        });
        logDiv.textContent += " (Terkirim ke Google Sheets)";
      } catch (e) {
        logDiv.textContent += " (Gagal kirim ke Google Sheets)";
      }
    } else {
      logDiv.textContent = "Verifikasi manual dibatalkan.";
    }
  }
  btnEnroll.disabled = false; btnAbsenMasuk.disabled = false; btnAbsenPulang.disabled = false;
}

btnHapusLog.onclick = () => {
  if (confirm("Yakin ingin menghapus seluruh data log absensi?")) {
    localStorage.removeItem('absensi');
    tampilkanAbsensiLog();
    generateCsvLink();
    logDiv.textContent = "Log absensi berhasil dihapus.";
  }
};

btnHapusDaftarWajah.onclick = () => {
  if (confirm("Yakin ingin menghapus seluruh daftar wajah? Semua karyawan harus daftar ulang!")) {
    localStorage.removeItem('faces');
    tampilkanListWajah();
    logDiv.textContent = "Daftar wajah berhasil dihapus. Semua karyawan harus daftar ulang.";
  }
};

btnLihatDaftarWajah.onclick = tampilkanListWajah;

window.onload = async () => {
  tampilkanAbsensiLog();
  tampilkanListWajah();
  generateCsvLink();
  await loadModels();
  await startCamera();
  logDiv.textContent = "Klik tombol untuk mulai absensi atau mendaftarkan wajah baru.";
};