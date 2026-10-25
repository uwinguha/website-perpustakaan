import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtklIVyHPGbPoTDMl2wA_GDwvPedtc5oQ",
  authDomain: "perpustakaan-hybrid-e965b.firebaseapp.com",
  projectId: "perpustakaan-hybrid-e965b",
  storageBucket: "perpustakaan-hybrid-e965b.firebasestorage.app",
  messagingSenderId: "622459383861",
  appId: "1:622459383861:web:44f0898a80a7a59c95c17c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUser = null; 
let books = [];
let requests = []; 
let activeEbook = null; 
let currentCategory = 'Semua';
let currentJenisLayanan = 'Fisik'; 

const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');

document.getElementById('btn-login-google').onclick = () => {
    signInWithPopup(auth, provider).catch(error => alert("Gagal Login: " + error.message));
};
document.getElementById('btn-logout').onclick = () => {
    signOut(auth).then(() => window.location.reload());
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-photo').src = user.photoURL;
        document.getElementById('user-name').textContent = user.displayName;
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        fetchData();
    } else {
        loginScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
});

async function fetchData() {
    try {
        const booksSnapshot = await getDocs(collection(db, "books"));
        books = booksSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const reqSnapshot = await getDocs(collection(db, "requests"));
        requests = reqSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        renderBuku(); renderTabelPermintaan(); renderTabelAdminBuku();
    } catch (error) {
        alert("Gagal mengambil data katalog.");
    }
}

const tabSiswaFisik = document.getElementById('tab-siswa-fisik');
const tabSiswaEbook = document.getElementById('tab-siswa-ebook');
const textJudulKatalog = document.getElementById('judul-katalog');
const textDeskripsiKatalog = document.getElementById('deskripsi-katalog');

tabSiswaFisik.onclick = () => {
    currentJenisLayanan = 'Fisik';
    tabSiswaFisik.className = 'px-4 py-2 bg-white shadow-sm text-blue-600 rounded-md font-bold text-sm transition';
    tabSiswaEbook.className = 'px-4 py-2 text-gray-600 rounded-md font-bold text-sm transition hover:bg-gray-200';
    textJudulKatalog.innerHTML = 'Katalog Buku Fisik <span class="text-sm font-normal text-gray-500 ml-2">(Perlu Ambil ke Perpus)</span>';
    textDeskripsiKatalog.textContent = 'Pesan (Booking) buku fisik pilihanmu dan ambil dengan membawa KTP/Kartu Pelajar.';
    renderBuku();
};

tabSiswaEbook.onclick = () => {
    currentJenisLayanan = 'E-Book';
    tabSiswaEbook.className = 'px-4 py-2 bg-white shadow-sm text-purple-600 rounded-md font-bold text-sm transition';
    tabSiswaFisik.className = 'px-4 py-2 text-gray-600 rounded-md font-bold text-sm transition hover:bg-gray-200';
    textJudulKatalog.innerHTML = 'Katalog E-Book <span class="text-sm font-normal text-gray-500 ml-2">(Baca Online)</span>';
    textDeskripsiKatalog.textContent = 'Akses buku digital (PDF) dengan batas waktu peminjaman 7 hari penuh.';
    renderBuku();
};

function renderBuku() {
    const catContainer = document.getElementById('kategori-container');
    catContainer.innerHTML = '';
    ['Semua', 'Agama', 'Sastra', 'Novel', 'Ilmu Pengetahuan'].forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `whitespace-nowrap px-4 py-2 rounded-full border font-bold text-sm ${currentCategory === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`;
        btn.textContent = cat;
        btn.onclick = () => { currentCategory = cat; renderBuku(); };
        catContainer.appendChild(btn);
    });

    const container = document.getElementById('daftar-buku');
    const searchQuery = document.getElementById('input-pencarian').value.toLowerCase();
    container.innerHTML = '';

    const filterBuku = books.filter(b => 
        b.jenis === currentJenisLayanan && 
        (currentCategory === 'Semua' || b.category === currentCategory) && 
        (b.title.toLowerCase().includes(searchQuery) || b.publisher.toLowerCase().includes(searchQuery))
    );

    if (filterBuku.length === 0) container.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">Belum ada koleksi ${currentJenisLayanan}.</p>`;

    filterBuku.forEach(b => {
        const isEbook = b.jenis === 'E-Book';
        const stik = isEbook ? '<span class="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-bold">💻 E-Book (PDF)</span>' : '<span class="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-bold">📚 Buku Fisik</span>';
        const info = isEbook ? '<span class="text-sm font-bold text-purple-600">Batas Baca: 7 Hari</span>' : `<span class="text-sm font-bold ${b.stock > 0 ? 'text-green-600' : 'text-red-600'}">Sisa Stok: ${b.stock}</span>`;
        const btnText = isEbook ? 'Buka E-Book' : 'Booking Sekarang';

        container.innerHTML += `
            <div class="bg-white p-4 rounded-lg shadow border-t-4 ${isEbook ? 'border-purple-500' : 'border-yellow-400'} flex flex-col justify-between">
                <div>
                    <div class="mb-2">${stik}</div>
                    <h3 class="font-bold text-gray-800 leading-tight mb-1">${b.title}</h3>
                    <p class="text-xs text-gray-500">${b.category}</p>
                    <p class="text-xs text-blue-600 font-semibold mb-3">Penerbit: ${b.publisher}</p>
                </div>
                <div class="flex flex-col gap-2">
                    ${info}
                    <button class="bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-700" onclick="${isEbook ? `mulaiBacaEbook('${b.id}')` : `bukaModalPinjam('${b.id}')`}" ${!isEbook && b.stock === 0 ? 'disabled style="opacity:0.5"' : ''}>${btnText}</button>
                </div>
            </div>
        `;
    });
}
document.getElementById('input-pencarian').addEventListener('input', renderBuku);

const modalPinjam = document.getElementById('modal-pinjam');
const formPinjam = document.getElementById('form-pinjam');

window.bukaModalPinjam = function(id) {
    const book = books.find(b => b.id === id);
    document.getElementById('pinjam-id-buku').value = id;
    document.getElementById('info-modal').innerHTML = `Buku: <b>${book.title}</b> (${book.publisher})<br>Akun Terhubung: <b>${currentUser.email}</b>`;
    modalPinjam.classList.remove('hidden');
}
document.getElementById('btn-batal-pinjam').onclick = () => modalPinjam.classList.add('hidden');

formPinjam.onsubmit = async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-pinjam');
    btnSubmit.disabled = true; btnSubmit.textContent = "Memproses...";

    const book = books.find(b => b.id === document.getElementById('pinjam-id-buku').value);
    
    try {
        const newStock = book.stock - 1;
        await updateDoc(doc(db, "books", book.id), { stock: newStock });
        book.stock = newStock;

        const newReq = {
            nama: document.getElementById('pinjam-nama').value,
            email: currentUser.email, 
            nim: document.getElementById('pinjam-nim').value,
            kelas: document.getElementById('pinjam-kelas').value,
            judul: book.title,
            status: 'Menunggu Persetujuan'
        };
        const docRef = await addDoc(collection(db, "requests"), newReq);
        newReq.id = docRef.id; requests.push(newReq);

        modalPinjam.classList.add('hidden');
        formPinjam.reset();
        alert('Booking Sukses! Cek antrean ke Admin.');
        renderBuku(); renderTabelPermintaan(); renderTabelAdminBuku();
    } catch (error) { alert("Terjadi kesalahan sistem."); }
    btnSubmit.disabled = false; btnSubmit.textContent = "Kirim Pesanan (Booking)";
};

window.mulaiBacaEbook = async function(bookId) {
    const book = books.find(b => b.id === bookId);
    document.getElementById('reader-judul').textContent = book.title;
    
    const bookmarkId = `${currentUser.uid}_${book.id}`;
    const bookmarkRef = doc(db, "bookmarks", bookmarkId);
    const bookmarkSnap = await getDoc(bookmarkRef);

    let savedData = { pageSaved: 1, expiredDate: new Date().getTime() + (7 * 24 * 60 * 60 * 1000) };
    
    if (bookmarkSnap.exists()) {
        savedData = bookmarkSnap.data();
    } else {
        await setDoc(bookmarkRef, savedData);
    }

    activeEbook = { bookId: book.id, title: book.title, url: book.pdfUrl, ...savedData, bookmarkId: bookmarkId };
    bukaPDFReader();
}

function bukaPDFReader() {
    const sekarang = new Date().getTime();
    const sisaWaktuHari = Math.ceil((activeEbook.expiredDate - sekarang) / (1000 * 60 * 60 * 24));
    
    document.getElementById('input-halaman').value = activeEbook.pageSaved; 
    
    if (sisaWaktuHari <= 0) {
        document.getElementById('reader-timer').textContent = 'KADALUWARSA (Terkunci)';
        document.getElementById('pdf-frame').src = ''; 
        document.getElementById('btn-perpanjang').classList.remove('hidden');
    } else {
        document.getElementById('reader-timer').textContent = `${sisaWaktuHari} Hari lagi`;
        document.getElementById('pdf-frame').src = activeEbook.url;
        document.getElementById('btn-perpanjang').classList.add('hidden');
    }
    
    document.getElementById('view-siswa').classList.add('hidden');
    document.getElementById('view-reader').classList.remove('hidden');
    document.getElementById('btn-baca-ebook').classList.remove('hidden');
}

document.getElementById('btn-simpan-bookmark').onclick = async () => {
    const hal = document.getElementById('input-halaman').value;
    try {
        await updateDoc(doc(db, "bookmarks", activeEbook.bookmarkId), { pageSaved: hal });
        activeEbook.pageSaved = hal;
        alert(`Penanda tersimpan permanen!`);
    } catch (e) { alert("Gagal menyimpan penanda."); }
};

document.getElementById('btn-tutup-reader').onclick = () => {
    document.getElementById('view-reader').classList.add('hidden');
    document.getElementById('view-siswa').classList.remove('hidden');
};
document.getElementById('btn-baca-ebook').onclick = () => bukaPDFReader();

document.getElementById('btn-perpanjang').onclick = async () => {
    const waktuBaru = new Date().getTime() + (7 * 24 * 60 * 60 * 1000);
    try {
        await updateDoc(doc(db, "bookmarks", activeEbook.bookmarkId), { expiredDate: waktuBaru });
        activeEbook.expiredDate = waktuBaru;
        alert('Akses diperpanjang 7 Hari!');
        bukaPDFReader();
    } catch(e) { alert("Gagal memperpanjang."); }
};

const viewAdmin = document.getElementById('view-admin');
const btnMasukAdmin = document.getElementById('btn-masuk-admin');
const btnKeluarAdmin = document.getElementById('btn-keluar-admin');

btnMasukAdmin.onclick = () => {
    const pin = prompt('Masukkan PIN Admin');
    if (pin === '429351') {
        document.getElementById('view-siswa').classList.add('hidden');
        document.getElementById('view-reader').classList.add('hidden');
        document.getElementById('btn-baca-ebook').classList.add('hidden');
        viewAdmin.classList.remove('hidden');
        btnMasukAdmin.classList.add('hidden'); btnKeluarAdmin.classList.remove('hidden');
    } else if (pin) alert('PIN Salah!');
};
btnKeluarAdmin.onclick = () => {
    viewAdmin.classList.add('hidden'); document.getElementById('view-siswa').classList.remove('hidden');
    btnKeluarAdmin.classList.add('hidden'); btnMasukAdmin.classList.remove('hidden');
    if(activeEbook) document.getElementById('btn-baca-ebook').classList.remove('hidden');
};

document.getElementById('tab-permintaan').onclick = () => {
    document.getElementById('section-permintaan').classList.remove('hidden');
    document.getElementById('section-kelola').classList.add('hidden');
};
document.getElementById('tab-kelola').onclick = () => {
    document.getElementById('section-kelola').classList.remove('hidden');
    document.getElementById('section-permintaan').classList.add('hidden');
};

function renderTabelPermintaan() {
    const tbody = document.getElementById('tabel-permintaan'); tbody.innerHTML = '';
    requests.forEach(req => {
        let aksi = ''; let badge = `<span class="bg-yellow-100 text-yellow-700 font-bold px-2 py-1 rounded text-xs">${req.status}</span>`;
        if (req.status === 'Menunggu Persetujuan') aksi = `<button onclick="window.ubahStatusBooking('${req.id}', 'Disetujui')" class="bg-blue-600 text-white text-xs px-3 py-1 rounded">Setujui Booking</button>`;
        else if (req.status === 'Disetujui') { badge = `<span class="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-xs">Menunggu Diambil</span>`; aksi = `<button onclick="window.ubahStatusBooking('${req.id}', 'Dikembalikan')" class="bg-gray-600 text-white text-xs px-3 py-1 rounded">Buku Dikembalikan</button>`; }
        else { badge = `<span class="bg-green-100 text-green-700 font-bold px-2 py-1 rounded text-xs">Selesai Dikembalikan</span>`; aksi = '-'; }

        tbody.innerHTML += `<tr class="border-b"><td class="p-2 font-bold">${req.nama}<br><span class="text-xs text-blue-500 font-normal">${req.email}</span></td><td class="p-2">${req.nim} <br><span class="text-xs text-gray-500">Kls: ${req.kelas}</span></td><td class="p-2 text-blue-600 font-bold">${req.judul}</td><td class="p-2 text-center">${badge}</td><td class="p-2 text-center">${aksi}</td></tr>`;
    });
}

window.ubahStatusBooking = async function(reqId, statusBaru) {
    try {
        const req = requests.find(r => r.id === reqId);
        await updateDoc(doc(db, "requests", reqId), { status: statusBaru });
        req.status = statusBaru;
        
        if (statusBaru === 'Dikembalikan') {
            const book = books.find(b => b.title === req.judul);
            if (book) {
                const newStock = book.stock + 1;
                await updateDoc(doc(db, "books", book.id), { stock: newStock });
                book.stock = newStock;
            }
        }
        renderBuku(); renderTabelAdminBuku(); renderTabelPermintaan();
    } catch (e) { alert("Gagal merubah status di Server."); }
}

function renderTabelAdminBuku() {
    const tbody = document.getElementById('tabel-kelola-buku'); tbody.innerHTML = '';
    books.forEach(b => {
        const formStok = b.jenis === 'E-Book' ? `<a href="${b.pdfUrl}" target="_blank" class="text-blue-600 text-xs font-bold underline">Lihat PDF</a>` : `<button onclick="window.ubahStok('${b.id}', -1)" class="bg-red-200 px-2 rounded font-bold">-</button> <span class="mx-2 font-bold">${b.stock}</span> <button onclick="window.ubahStok('${b.id}', 1)" class="bg-green-200 px-2 rounded font-bold">+</button>`;
        const btnHapus = `<button onclick="window.hapusBuku('${b.id}')" class="ml-4 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold hover:bg-red-700">Hapus</button>`;
        
        tbody.innerHTML += `<tr class="border-b"><td class="p-2 font-bold">${b.title}<br><span class="text-xs text-blue-600 font-normal">Penerbit: ${b.publisher}</span></td><td class="p-2 text-sm">${b.category}</td><td class="p-2 text-sm font-bold ${b.jenis === 'E-Book'?'text-purple-600':'text-yellow-600'}">${b.jenis}</td><td class="p-2 flex items-center justify-center">${formStok} ${btnHapus}</td></tr>`;
    });
}

window.ubahStok = async function(bookId, jumlah) {
    const book = books.find(b => b.id === bookId);
    if (book.stock + jumlah >= 0) { 
        try {
            const newStock = book.stock + jumlah;
            await updateDoc(doc(db, "books", bookId), { stock: newStock });
            book.stock = newStock; renderBuku(); renderTabelAdminBuku(); 
        } catch (e) { alert("Gagal merubah stok."); }
    }
}

window.hapusBuku = async function(bookId) {
    if (confirm("Yakin ingin menghapus buku ini secara permanen dari sistem?")) {
        try {
            await deleteDoc(doc(db, "books", bookId));
            books = books.filter(b => b.id !== bookId); 
            renderBuku(); 
            renderTabelAdminBuku();
            alert("Buku berhasil dihapus!");
        } catch (error) {
            alert("Gagal menghapus buku dari server.");
        }
    }
}

const modalTambah = document.getElementById('modal-tambah'); const inputJenis = document.getElementById('tambah-jenis');
inputJenis.onchange = () => { document.getElementById('div-stok').classList.toggle('hidden', inputJenis.value === 'E-Book'); document.getElementById('div-pdf').classList.toggle('hidden', inputJenis.value === 'Fisik'); };
document.getElementById('btn-tambah-buku').onclick = () => modalTambah.classList.remove('hidden');
document.getElementById('btn-batal-tambah').onclick = () => modalTambah.classList.add('hidden');

document.getElementById('form-tambah-buku').onsubmit = async (e) => {
    e.preventDefault();
    const btnSimpan = e.target.querySelector('button[type="submit"]');
    btnSimpan.disabled = true; btnSimpan.textContent = "Menyimpan...";

    const newBookData = {
        title: document.getElementById('tambah-judul').value,
        publisher: document.getElementById('tambah-penerbit').value,
        category: document.getElementById('tambah-kategori').value,
        jenis: inputJenis.value,
        stock: inputJenis.value === 'Fisik' ? parseInt(document.getElementById('tambah-stok').value) : null,
        pdfUrl: inputJenis.value === 'E-Book' ? document.getElementById('tambah-pdf').value : null
    };

    try {
        const docRef = await addDoc(collection(db, "books"), newBookData);
        newBookData.id = docRef.id; books.push(newBookData);
        modalTambah.classList.add('hidden'); document.getElementById('form-tambah-buku').reset(); inputJenis.onchange(); 
        alert('Buku Berhasil Ditambahkan!'); renderBuku(); renderTabelAdminBuku();
    } catch (error) { alert("Gagal menambah buku."); }
    btnSimpan.disabled = false; btnSimpan.textContent = "Simpan Buku";
};