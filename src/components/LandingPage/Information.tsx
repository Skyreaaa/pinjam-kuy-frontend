import React, { useState } from 'react';
import './LandingPage.css';
import './Information.css';
import { BiMapPin, BiPhone, BiEnvelope, BiTime, BiBook, BiUserCircle, BiIdCard, BiInfoCircle, BiCollection, BiGroup } from 'react-icons/bi';
import { BiCheckCircle } from 'react-icons/bi';
import Navbar from './Navbar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

interface InformationProps {
  onBack: () => void;
  onNavigateToLogin: () => void;
  onNavigateToCollection?: () => void;
  onNavigateToInformation?: () => void;
}

const Information: React.FC<InformationProps> = ({ onBack, onNavigateToLogin, onNavigateToCollection, onNavigateToInformation }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <div className="information-page">
      <Navbar 
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToLanding={onBack}
        onNavigateToInformation={onNavigateToInformation}
        onNavigateToCollection={onNavigateToCollection}
      />

      {/* Main Content */}
      <div className="info-content">
          <div className="info-container" id="informasi">
          
          {/* Hero Banner */}
          <section className="info-hero-banner" id="top">
            <BiInfoCircle className="hero-icon" />
            <h1>Informasi Perpustakaan</h1>
            <p>Universitas Widyatama</p>
          </section>

          {/* About Section */}
          <section className="info-section" id="tentang">
            <div className="section-header">
              <BiBook className="section-icon" />
              <h2>Tentang Perpustakaan</h2>
            </div>
            <div className="about-content">
              <p>
                Selamat datang di Perpustakaan Universitas Widyatama. Kami menyediakan berbagai layanan 
                dan koleksi untuk mendukung kegiatan akademik Anda. Perpustakaan kami berkomitmen untuk 
                menyediakan akses informasi yang berkualitas bagi seluruh civitas akademika.
              </p>
              <p>
                Dengan koleksi yang terus berkembang, baik dalam bentuk cetak maupun digital, kami 
                berupaya memfasilitasi kebutuhan pembelajaran dan penelitian mahasiswa, dosen, dan staf.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="info-section" id="contact">
            <div className="section-header">
              <BiEnvelope className="section-icon" />
              <h2>Informasi Kontak</h2>
            </div>
            <div className="contact-grid">
              <div className="contact-item">
                <BiMapPin className="contact-icon" />
                <div className="contact-details">
                  <h3>Alamat</h3>
                  <p>Jalan Cikutra No.204 Bandung</p>
                  <p>Kodepos: 40125</p>
                </div>
              </div>
              <div className="contact-item">
                <BiPhone className="contact-icon" />
                <div className="contact-details">
                  <h3>WhatsApp</h3>
                  <p>0852-1111-5026</p>
                </div>
              </div>
              <div className="contact-item">
                <BiEnvelope className="contact-icon" />
                <div className="contact-details">
                  <h3>Email</h3>
                  <p>sirkulasi@widyatama.ac.id</p>
                  <p>library@widyatama.ac.id</p>
                </div>
              </div>
            </div>
          </section>

          {/* Service Schedule */}
          <section className="info-section" id="schedule">
            <div className="section-header">
              <BiTime className="section-icon" />
              <h2>Jadwal Pelayanan Offline</h2>
            </div>
            <div className="schedule-grid">
              <div className="schedule-card">
                <h3>Senin - Jumat</h3>
                <div className="schedule-time">
                  <div className="time-row">
                    <span className="time-label">Buka:</span>
                    <span className="time-value">08.00 AM</span>
                  </div>
                  <div className="time-row">
                    <span className="time-label">Tutup:</span>
                    <span className="time-value">18.00 PM</span>
                  </div>
                </div>
              </div>
              <div className="schedule-card">
                <h3>Sabtu</h3>
                <div className="schedule-time">
                  <div className="time-row">
                    <span className="time-label">Buka:</span>
                    <span className="time-value">08.00 AM</span>
                  </div>
                  <div className="time-row">
                    <span className="time-label">Tutup:</span>
                    <span className="time-value">16.00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Collections */}
          <section className="info-section" id="collections">
            <div className="section-header">
              <BiCollection className="section-icon" />
              <h2>Koleksi Perpustakaan</h2>
            </div>
            <div className="collections-content">
              <p className="collection-intro">
                Perpustakaan Universitas Widyatama memiliki berbagai jenis koleksi, baik itu tercetak maupun bentuk digital:
              </p>
              
              <div className="collection-list">
                <div className="collection-item">
                  <BiBook className="collection-icon-inline" />
                  <div>
                    <h3>Koleksi Umum</h3>
                    <p>Buku teks yang berhubungan dengan semua mata kuliah program studi yang ada di Universitas Widyatama.</p>
                  </div>
                </div>

                <div className="collection-item">
                  <BiBook className="collection-icon-inline" />
                  <div>
                    <h3>Koleksi Reserve</h3>
                    <p>Buku-buku cadangan dari koleksi umum yang hanya dapat dibaca di area perpustakaan. Ditandai dengan kode <strong>Rv</strong> sebelum No Klasifikasi pada punggung buku. Lokasi: <strong>Lantai 1</strong>.</p>
                  </div>
                </div>

                <div className="collection-item">
                  <BiBook className="collection-icon-inline" />
                  <div>
                    <h3>Koleksi Referensi</h3>
                    <p>Ensiklopedia, kamus, handbook, Peraturan Pemerintah, dan directory. Ditandai dengan kode <strong>R</strong> sebelum nomor klasifikasi. Lokasi: <strong>Lantai 2</strong>. Koleksi ini hanya dapat dibaca di perpustakaan atau difotokopi melalui petugas.</p>
                  </div>
                </div>

                <div className="collection-item">
                  <BiBook className="collection-icon-inline" />
                  <div>
                    <h3>Koleksi Local Content</h3>
                    <p>Koleksi yang dihasilkan oleh civitas akademika Universitas Widyatama, seperti skripsi, tesis, dan karya ilmiah mahasiswa atau dosen.</p>
                  </div>
                </div>

                <div className="collection-item">
                  <BiBook className="collection-icon-inline" />
                  <div>
                    <h3>Koleksi Terbitan Berkala</h3>
                    <p>Terbitan berseri yang bersifat ilmiah atau populer seperti jurnal, majalah, dan koran yang diterbitkan oleh organisasi profesi, praktisi, maupun badan swasta atau pemerintah (dalam dan luar negeri).</p>
                  </div>
                </div>

                <div className="collection-item">
                  <BiBook className="collection-icon-inline" />
                  <div>
                    <h3>Koleksi Digital/Elektronik</h3>
                    <p>Koleksi dalam bentuk elektronik berupa hasil karya civitas akademika, e-journal yang dilanggan perpustakaan, serta e-book (berlangganan dan gratis).</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Library Membership */}
            <section className="info-section" id="peraturan">
            <div className="section-header">
              <BiGroup className="section-icon" />
              <h2>Keanggotaan Perpustakaan</h2>
            </div>
            <div className="membership-card">
              <BiIdCard className="membership-icon" />
              <div className="membership-content">
                <h3>Siapa yang Bisa Menjadi Anggota?</h3>
                <p>
                  Dosen, Staf, dan Mahasiswa secara otomatis menjadi anggota perpustakaan. 
                  <strong> Kartu Mahasiswa berfungsi juga sebagai Kartu Perpustakaan.</strong>
                </p>
              </div>
            </div>
          </section>

          {/* Layanan Perpustakaan */}
          <section className="info-section layanan-section" id="layanan">
                      {/* Peraturan Perpustakaan */}
                      <section className="info-section" id="peraturan">
                        <div className="section-header">
                          <BiBook className="section-icon reactbit-animate" />
                          <h2>Peraturan Perpustakaan</h2>
                        </div>
                        <div className="layanan-list-wrapper">
                          <ol className="layanan-detail-list layanan-a-g">
                            <li><span className="layanan-label">1. Ketentuan Umum</span>
                              <ul>
                                <li>Pengunjung wajib menunjukkan kartu anggota saat masuk.</li>
                                <li>Wajib menjaga ketertiban, kebersihan, dan kenyamanan ruang perpustakaan.</li>
                                <li>Wajib berpakaian rapi dan sopan.</li>
                                <li>Wajib menitipkan barang di locker.</li>
                                <li>Wajib mengembalikan buku sebelum jatuh tempo.</li>
                              </ul>
                            </li>
                            <li><span className="layanan-label">2. Sanksi</span>
                              <ul>
                                <li>Pelanggaran terhadap peraturan dapat dikenakan sanksi sesuai ketentuan perpustakaan.</li>
                              </ul>
                            </li>
                          </ol>
                        </div>
                      </section>
            <div className="section-header">
              {/* TODO: Tambahkan animasi React Bit di icon berikut */}
              <BiBook className="section-icon reactbit-animate" />
              <h2>Layanan Perpustakaan</h2>
            </div>
            <div className="layanan-list-wrapper">
              <h3 className="layanan-subtitle">Jenis Layanan Perpustakaan</h3>
              <ol className="layanan-detail-list layanan-a-g">
                <li><span className="layanan-label">A. Ketentuan Umum</span>
                  <ul>
                    <li>Pengunjung yang diizinkan masuk adalah semua anggota perpustakaan U'Tama.</li>
                    <li>Mahasiswa non-U'Tama bebas masuk jika menunjukkan kartu FPPT Jawa Barat.</li>
                    <li>Umum bisa masuk setelah membayar biaya pendaftaran Rp 10.000,-.</li>
                    <li>Wajib menggunakan masker selama di perpustakaan.</li>
                    <li>Wajib mengembalikan semua pinjaman sebelum jatuh tempo.</li>
                    <li>Wajib menitipkan tas, laptop, jaket, dll di locker.</li>
                    <li>Berpakaian rapi, tidak memakai kaos oblong, celana pendek, sandal jepit.</li>
                    <li>Wajib memperlihatkan kartu mahasiswa/pegawai saat masuk.</li>
                    <li>Kartu mahasiswa berfungsi sebagai kartu anggota perpustakaan.</li>
                    <li>Menjaga ketertiban dan kebersihan ruang perpustakaan.</li>
                  </ul>
                </li>
                <li><span className="layanan-label">B. Jam Buka</span>
                  <ul>
                    <li>Senin-Jumat: 08.00 - 18.00 WIB</li>
                    <li>Sabtu: 08.00 - 16.00 WIB</li>
                  </ul>
                </li>
                <li><span className="layanan-label">C. Pelayanan Locker</span>
                  <ul>
                    <li>Layanan penitipan barang yang tidak diperbolehkan dibawa masuk ke perpustakaan.</li>
                    <li>Hanya untuk pengunjung yang masuk ke perpustakaan.</li>
                    <li>Jangan tinggalkan barang berharga di locker.</li>
                  </ul>
                </li>
                <li><span className="layanan-label">D. Pelayanan Offline Sirkulasi</span>
                  <ul>
                    <li>Koleksi sirkulasi: buku-buku yang dapat dipinjam sendiri oleh anggota.</li>
                    <li>Ketentuan peminjaman: 1 minggu (mahasiswa), 1 semester (karyawan/dosen).</li>
                    <li>Wajib menggunakan kartu anggota saat meminjam.</li>
                    <li>Wajib mengembalikan buku sebelum jatuh tempo.</li>
                  </ul>
                </li>
                <li><span className="layanan-label">E. Pelayanan Online Perpustakaan</span>
                  <ul>
                    <li>Peminjaman buku tercetak, perpanjangan, pengembalian, permohonan softfile, surat bebas pustaka, validasi TA/Skripsi/Jurnal, repository, E-Book/E-Journal, ruang baca, workstation.</li>
                    <li>Semua layanan online dapat diakses via email/website yang tertera di dokumen.</li>
                  </ul>
                </li>
                <li><span className="layanan-label">F. Pelayanan Koleksi Ruang Baca</span>
                  <ul>
                    <li>Koleksi ruang baca: cadangan, referensi, terbitan berkala, local content.</li>
                    <li>Selama pandemi, jumlah anggota dibatasi.</li>
                  </ul>
                </li>
                <li><span className="layanan-label">G. Koleksi Workstation</span>
                  <ul>
                    <li>Fasilitas komputer untuk penelusuran informasi, akses e-book, e-journal, dan tugas akademik.</li>
                    <li>Pengunjung wajib menjaga ketertiban dan kebersihan workstation.</li>
                  </ul>
                </li>
              </ol>
              <div className="layanan-note">* Detail layanan online, jam buka, dan ketentuan lengkap dapat dilihat pada dokumen resmi atau website perpustakaan.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Information;