// Konfigurasi Database Realtime (LOCK - TIDAK BOLEH DIUBAH)
const firebaseConfig = {
    apiKey: "AIzaSyD9BmV4XKXuMWa4PZHpb7Bbt-rHs61m3lE",
    databaseURL: "https://absensi-polri-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "absensi-polri",
    storageBucket: "absensi-polri.firebasestorage.app",
    messagingSenderId: "19006760644",
    appId: "1:19006760644:web:b980f54aea123e92ed4b91"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Logika Buka Tutup Menu Samping
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const overlay = document.getElementById('sidebar-overlay');

function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

menuToggle.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

// Logika Navigasi Halaman dengan Proteksi Password Admin
function showPage(pageId) {
    // Jika mencoba masuk ke menu admin
    if (pageId === 'admin') {
        toggleSidebar(); // Tutup sidebar terlebih dahulu agar rapi
        
        Swal.fire({
            title: 'Akses Administrator',
            text: 'Masukkan password untuk masuk ke Panel Admin:',
            input: 'password',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Masuk',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#0056b3',
            preConfirm: (password) => {
                if (password === 'EMS_JAYAKARTA#2026') {
                    return true;
                } else {
                    Swal.showValidationMessage('Password Salah! Akses Ditolak.');
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Jika password benar, aktifkan halaman admin
                document.querySelectorAll('.page-section').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById('page-admin').classList.add('active');
                loadAdminData();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Akses Diterima',
                    text: 'Selamat datang di Panel Administrator EMS Jayakarta.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                // Jika batal atau gagal, pastikan tetap di halaman beranda/aktif sebelumnya
                document.getElementById('page-beranda').classList.add('active');
            }
        });
        return;
    }

    // Navigasi normal untuk menu selain admin
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('page-' + pageId).classList.add('active');
    toggleSidebar();
}

// ==========================================
// AMBIL DATA & TAMPILKAN KE HALAMAN PUBLIC
// ==========================================

// Slideshow Beranda Otomatis
let slideIndex = 0;
function showSlides() {
    let i;
    let slides = document.getElementsByClassName("slide");
    let dots = document.getElementsByClassName("dot");
    if (slides.length === 0) return;
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";  
        if(dots[i]) dots[i].className = dots[i].className.replace(" active", "");
    }
    slideIndex++;
    if (slideIndex > slides.length) {slideIndex = 1}    
    slides[slideIndex-1].style.display = "block";  
    if(dots[slideIndex-1]) dots[slideIndex-1].className += " active";
    setTimeout(showSlides, 3000); // Ganti gambar otomatis setiap 3 detik
}

database.ref('ems_web/slides').on('value', (snapshot) => {
    const container = document.getElementById('slideshow-container');
    const dots = document.getElementById('dot-container');
    container.innerHTML = '';
    dots.innerHTML = '';
    
    let hasData = false;
    snapshot.forEach(child => {
        hasData = true;
        const data = child.val();
        
        container.innerHTML += `
            <div class="slide fade">
                <img src="${data.url}" alt="${data.title}">
            </div>
        `;
        dots.innerHTML += `<span class="dot"></span>`;
    });
    
    if(!hasData) {
        container.innerHTML = `<div class="slide" style="display:block;"><img src="https://via.placeholder.com/1200x400?text=EMS+Jayakarta+Roleplay" alt="Default"></div>`;
    } else {
        slideIndex = 0;
        showSlides();
    }
});

// Render Tampilan Grid (Berita, Pejabat, Gallery, Kegiatan)
function renderGrid(refPath, containerId, hasTitleText = true) {
    database.ref(refPath).on('value', (snapshot) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        snapshot.forEach(child => {
            const data = child.val();
            let bodyHTML = '';
            if(hasTitleText) {
                bodyHTML = `
                    <div class="card-body">
                        <h3 class="card-title">${data.title || data.nama}</h3>
                        ${data.desc || data.jabatan ? `<p class="card-text">${data.desc || data.jabatan}</p>` : ''}
                    </div>
                `;
            }
            container.innerHTML += `
                <div class="card">
                    <img src="${data.url}" alt="Image">
                    ${bodyHTML}
                </div>
            `;
        });
    });
}

// Load data komponen Publik
renderGrid('ems_web/berita', 'berita-container', true);
renderGrid('ems_web/pejabat', 'pejabat-container', true);
renderGrid('ems_web/gallery', 'gallery-container', false);
renderGrid('ems_web/kegiatan', 'kegiatan-container', false);

// Daftar Anggota Table
database.ref('ems_web/anggota').on('value', (snapshot) => {
    const container = document.getElementById('anggota-container');
    container.innerHTML = '';
    snapshot.forEach(child => {
        const data = child.val();
        container.innerHTML += `
            <tr>
                <td>${data.nama}</td>
                <td><span class="badge" style="background:var(--primary-blue); color:white; padding:3px 8px; border-radius:12px; font-size:12px;">${data.jabatan}</span></td>
            </tr>
        `;
    });
});


// ==========================================
// LOGIKA UTAMA PANEL ADMINISTRATOR (CRUD)
// ==========================================
let currentAdminTab = 'slides';

const adminSchema = {
    slides: { fields: ['title', 'url'], labels: ['Judul Slide', 'URL Gambar'] },
    berita: { fields: ['title', 'url', 'desc'], labels: ['Judul Berita', 'URL Gambar', 'Deskripsi'] },
    pejabat: { fields: ['nama', 'url', 'jabatan'], labels: ['Nama Pejabat', 'URL Foto', 'Jabatan'] },
    gallery: { fields: ['title', 'url'], labels: ['Judul/Keterangan', 'URL Gambar'] },
    kegiatan: { fields: ['title', 'url'], labels: ['Judul Kegiatan', 'URL Gambar'] },
    anggota: { fields: ['nama', 'jabatan'], labels: ['Nama Anggota', 'Pangkat/Jabatan'] }
};

function switchAdminTab(tab) {
    currentAdminTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    loadAdminData();
}

function loadAdminData() {
    const schema = adminSchema[currentAdminTab];
    const thead = document.getElementById('admin-table-head');
    const tbody = document.getElementById('admin-table-body');
    
    thead.innerHTML = '';
    schema.labels.forEach(label => {
        thead.innerHTML += `<th>${label}</th>`;
    });
    thead.innerHTML += `<th>Aksi</th>`;
    
    database.ref('ems_web/' + currentAdminTab).on('value', (snapshot) => {
        tbody.innerHTML = '';
        snapshot.forEach(child => {
            const data = child.val();
            const key = child.key;
            let rowHTML = '';
            schema.fields.forEach(field => {
                let val = data[field] || '-';
                if(field === 'url') val = `<img src="${val}" width="50" height="50" style="object-fit:cover; border-radius:5px;">`;
                rowHTML += `<td>${val}</td>`;
            });
            
            rowHTML += `
                <td class="action-btns">
                    <button class="btn btn-warning btn-sm" onclick="editData('${key}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${key}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            tbody.innerHTML += `<tr>${rowHTML}</tr>`;
        });
    });
}

// Aksi Tambah Data menggunakan SweetAlert2
function openAddModal() {
    const schema = adminSchema[currentAdminTab];
    let htmlForm = '';
    
    schema.fields.forEach((field, i) => {
        htmlForm += `<input id="swal-input-${field}" class="swal2-input" placeholder="${schema.labels[i]}">`;
    });

    Swal.fire({
        title: 'Tambah Data ' + currentAdminTab.toUpperCase(),
        html: htmlForm,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        preConfirm: () => {
            let data = {};
            for(let field of schema.fields) {
                const val = document.getElementById(`swal-input-${field}`).value;
                if(!val) {
                    Swal.showValidationMessage(`Harap isi semua kolom`);
                    return false;
                }
                data[field] = val;
            }
            return data;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            database.ref('ems_web/' + currentAdminTab).push(result.value).then(() => {
                Swal.fire('Tersimpan!', 'Data sukses ditambahkan.', 'success');
            });
        }
    });
}

// Aksi Edit Data menggunakan SweetAlert2
function editData(key) {
    const schema = adminSchema[currentAdminTab];
    
    database.ref('ems_web/' + currentAdminTab + '/' + key).once('value').then(snapshot => {
        const currentData = snapshot.val();
        let htmlForm = '';
        
        schema.fields.forEach((field, i) => {
            htmlForm += `<input id="swal-input-${field}" class="swal2-input" placeholder="${schema.labels[i]}" value="${currentData[field] || ''}">`;
        });

        Swal.fire({
            title: 'Edit Data',
            html: htmlForm,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Update',
            preConfirm: () => {
                let data = {};
                for(let field of schema.fields) {
                    data[field] = document.getElementById(`swal-input-${field}`).value;
                }
                return data;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                database.ref('ems_web/' + currentAdminTab + '/' + key).update(result.value).then(() => {
                    Swal.fire('Diupdate!', 'Data sukses diubah.', 'success');
                });
            }
        });
    });
}

// Aksi Hapus Data menggunakan SweetAlert2
function deleteData(key) {
    Swal.fire({
        title: 'Apakah anda yakin?',
        text: "Data yang dihapus tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            database.ref('ems_web/' + currentAdminTab + '/' + key).remove().then(() => {
                Swal.fire('Terhapus!', 'Data telah dihapus dari sistem.', 'success');
            });
        }
    });
}

window.onload = () => {
    document.getElementById('page-beranda').classList.add('active');
}

