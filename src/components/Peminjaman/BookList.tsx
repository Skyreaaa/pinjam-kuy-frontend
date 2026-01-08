import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBook, FaSearch, FaExclamationCircle, FaUndo, FaList, FaStar, FaClock } from 'react-icons/fa';
import { MdLibraryBooks } from 'react-icons/md';
import FilterSidebar from './FilterSidebar';
import { FaFilter } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';
import LazyImage from '../common/LazyImage';
import ceriaIcon from '../../assets/ceria.png';

// HeaderV5
interface HeaderV5Props {
	onBack: () => void;
	currentPath: string;
	searchTerm: string;
	setSearchTerm: (term: string) => void;
	title: string;
	onFilterClick?: () => void;
}
export const HeaderV5: React.FC<HeaderV5Props> = ({ onBack, currentPath, searchTerm, setSearchTerm, title, onFilterClick }) => {
	const navigate = useNavigate();
	const isSearchVisible = currentPath === '/' || currentPath === '/borrowing-page';
	const handleBack = () => {
		if (currentPath === '/loans') {
			navigate('/borrowing-page');
		} else {
			navigate('/home');
		}
	};
	return (
		<div className="borrowing-header-v5">
			<div className="header-top-v5">
				
				{/* Hapus icon FaList di header agar tidak dobel */}
			</div>
			<div className={`header-content-v5 ${isSearchVisible ? 'with-search' : ''}`}> 
				<div className="header-title-box-v5">
					<img src={ceriaIcon} alt="Ceria Icon" className="ceria-icon-v5" />
					<h2>{title}</h2>
				</div>
				{isSearchVisible && onFilterClick && (
					<div className="header-search-filter-v5" style={{display:'flex',alignItems:'center',gap:10,marginTop:12,flexWrap:'wrap'}}>
						<form onSubmit={e => { e.preventDefault(); }} style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:200}}>
							<input
								type="text"
								placeholder="Cari judul/penulis..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className="search-input-v5 modern-input"
								style={{padding:'10px 16px',border:'1px solid rgba(255,255,255,0.3)',borderRadius:20,width:'100%',fontSize:'0.95em',transition:'all 0.2s',background:'rgba(255,255,255,0.95)',color:'#333'}}
							/>
							<button type="submit" className="search-button-v5 icon-btn" style={{background:'#2d7be5',border:'none',borderRadius:'50%',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 3px 10px rgba(45,123,229,0.4)',transition:'all 0.2s'}} title="Cari">
								<FaSearch style={{fontSize:'0.95em',color:'#fff'}} />
							</button>
						</form>
						<button className="filter-icon-btn-v5 icon-btn" title="Filter" style={{background:'#d32f2f',border:'none',borderRadius:'50%',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 3px 10px rgba(211,47,47,0.4)',transition:'all 0.2s'}} onClick={onFilterClick}>
							<FaFilter style={{fontSize:'0.95em',color:'#fff'}} />
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

// BookCardV5
// Gunakan tipe Book dari src/types agar konsisten
export type Book = import('../../types').Book;

interface BookCardV5Props {
	book: Book;
	onClick: () => void;
}
const BookCardV5: React.FC<BookCardV5Props> = ({ book, onClick }) => {
	const bookTitle = book.judul || book.title || 'Judul Tidak Tersedia';
	const bookAuthor = book.penulis || book.author || 'Penulis Tidak Tersedia';
	const bookPublisher = (book as any).publisher || (book as any).penerbit || '';
	const bookCategory = (book as any).category || (book as any).kategori || '';
	const bookYear = (book as any).publicationYear || (book as any).year || (book as any).tahun || '';
	// Gunakan imageUrl/image_url/cover_url dari BE (Cloudinary) jika ada
	let coverUrl = book.imageUrl || (book as any).image_url || (book as any).cover_url || '';
	if (!coverUrl) coverUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23ddd" width="150" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="14"%3ETidak Ada Gambar%3C/text%3E%3C/svg%3E';
	console.log('Book:', bookTitle, '| imageUrl:', book.imageUrl, '| image_url:', (book as any).image_url, '| cover_url:', (book as any).cover_url, '| used:', coverUrl);
	return (
		<div className="book-card-v5" onClick={onClick}>
			<div className="book-cover-v5">
				<LazyImage
					src={coverUrl}
					alt={`Sampul buku ${bookTitle}`}
					className=""
					onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23ddd" width="150" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="14"%3ETidak Ada Gambar%3C/text%3E%3C/svg%3E'; }}
				/>
			</div>
			<div className="book-info-v5">
				<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
					<p className="book-kode-v5">#{book.kodeBuku || 'N/A'}</p>
					{bookCategory && (
						<span className="book-category-badge" style={{fontSize:'0.75em',background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',color:'#fff',padding:'2px 10px',borderRadius:12,fontWeight:600}}>{bookCategory}</span>
					)}
				</div>
				<h4 title={bookTitle}>{bookTitle}</h4> 
				<p className="book-author-v5">{bookAuthor}</p>
				{bookPublisher && (
					<p className="book-publisher-v5" style={{fontSize:'0.85em',color:'#7f8c8d',marginTop:2}}>Penerbit: {bookPublisher}</p>
				)}
				{bookYear && (
					<p className="book-year-v5" style={{fontSize:'0.85em',color:'#7f8c8d',marginTop:2}}>Tahun: {bookYear}</p>
				)}
				{book.description && (
					<p className="book-desc-v5" title={book.description}>{book.description}</p>
				)}
				<div className="book-stock-v5">
					<span className={book.availableStock > 0 ? 'available' : 'unavailable'}>
						<FaBook /> Stok: {book.availableStock} dari {book.totalStock}
					</span>
				</div>
			</div>
		</div>
	);
};

// CategoryFilterV5
interface CategoryFilterV5Props {
	activeFilter: string;
	setActiveFilter: (filter: string) => void;
}
const CategoryFilterV5: React.FC<CategoryFilterV5Props> = ({ activeFilter, setActiveFilter }) => {
	const filters = [
		{ label: 'Semua', icon: <MdLibraryBooks /> },
		{ label: 'Populer', icon: <FaStar /> },
		{ label: 'Tahun Terbaru', icon: <FaClock /> }
	];
	return (
		<div className="category-filter-v5">
			{filters.map(filter => (
				<button
					key={filter.label}
					className={`filter-button-v5 ${activeFilter === filter.label ? 'active' : ''}`}
					onClick={() => setActiveFilter(filter.label)}
				>
					<span className="filter-icon">{filter.icon}</span>
					<span>{filter.label}</span>
				</button>
			))}
		</div>
	);
};

// BookList
export interface BookListProps {
	books: Book[];
	isLoading: boolean;
	error: string | null;
	currentPath: string;
	onBack: () => void;
	fetchBooks: (overrideFilter?: string) => void;
	activeFilterExternal?: string;
	setActiveFilterExternal?: (f: string) => void;
	onBookClick?: (book: Book) => void;
}

export const BookList: React.FC<BookListProps> = ({ books, isLoading, error, currentPath, onBack, fetchBooks, activeFilterExternal, setActiveFilterExternal, onBookClick }) => {
	 const navigate = useNavigate();
	 const [searchTerm, setSearchTerm] = useState('');
	 const [activeFilter, setActiveFilterLocal] = useState('Semua');
	 const [showFilterModal, setShowFilterModal] = useState(false);
	 const [filters, setFilters] = useState({
		 tahunFrom: 0,
		 tahunTo: 0,
		 tersedia: [],
		 lampiran: [],
		 jenisKoleksi: [],
		 pemusatan: [],
		 lokasi: [],
		 bahasa: [],
		 prodi: [],
		 minRating: 0,
	 });
	useEffect(()=>{
		if (activeFilterExternal && activeFilterExternal !== activeFilter) {
			setActiveFilterLocal(activeFilterExternal);
		}
	}, [activeFilterExternal]);
	const setActiveFilter = (val: string) => {
		setActiveFilterLocal(val);
		if (setActiveFilterExternal) setActiveFilterExternal(val);
	};
	const filteredAndSortedBooks = useMemo(() => {
		let result = [...books];
		if (searchTerm.trim()) {
			const query = searchTerm.toLowerCase();
			result = result.filter(book => {
				const title = (book.judul || book.title || '').toLowerCase();
				const author = (book.penulis || book.author || '').toLowerCase();
				return title.includes(query) || author.includes(query);
			});
		}
		if (activeFilter === 'Tahun Terbaru') {
			result.sort((a, b) => {
				const yearA = typeof a.year === 'number' ? a.year : parseInt(a.year || '0');
				const yearB = typeof b.year === 'number' ? b.year : parseInt(b.year || '0');
				return yearB - yearA;
			});
		} else if (activeFilter === 'Populer') {
			result.sort((a, b) => ((a as any).borrowCount || 0) - ((b as any).borrowCount || 0));
		}
		return result;
	}, [books, searchTerm, activeFilter]);
	
	if (isLoading && books.length === 0) return (
		<>
			<HeaderV5 
				onBack={onBack} 
				currentPath={currentPath} 
				searchTerm={searchTerm} 
				setSearchTerm={setSearchTerm} 
				title="Cari Buku"
				onFilterClick={() => setShowFilterModal(true)}
			/> 
			<div className="book-list-container-v5">
				<p className="loading-bar">Memuat daftar buku...</p>
			</div>
		</>
	);
	 return (
		 <>
			 <HeaderV5 
				onBack={onBack} 
				currentPath={currentPath} 
				searchTerm={searchTerm} 
				setSearchTerm={setSearchTerm} 
				title="Cari Buku"
				onFilterClick={() => setShowFilterModal(true)}
			 /> 
			 <div className="book-list-container-v5">
				 <div className="main-content-area-v5">
					 <div className="category-refresh-wrapper-v5" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,paddingLeft:0,paddingRight:0,flexWrap:'wrap',gap:12}}>
						 <CategoryFilterV5 activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
						 <button onClick={()=>fetchBooks()} className="refresh-button-v5 modern-btn" title="Refresh Data" style={{flexShrink:0}}>
							 <FaUndo /> <span>Refresh Data</span>
						 </button>
					 </div>
					 {error && <p className="status-message error"><FaExclamationCircle /> {error}</p>}
					 {/* Modal filter ala koleksi page */}
					 {showFilterModal && (
						 <div className="filter-modal-popup-bg" onClick={() => setShowFilterModal(false)}>
							 <div className="filter-modal-popup" onClick={e => e.stopPropagation()}>
								 <FilterSidebar
									 filters={filters}
									 setFilters={setFilters}
									 onApply={() => setShowFilterModal(false)}
									 onReset={() => {
										 setFilters({
											 tahunFrom: 0,
											 tahunTo: 0,
											 tersedia: [],
											 lampiran: [],
											 jenisKoleksi: [],
											 pemusatan: [],
											 lokasi: [],
											 bahasa: [],
											 prodi: [],
											 minRating: 0,
										 });
										 setShowFilterModal(false);
									 }}
								 />
							 </div>
						 </div>
					 )}
					 {filteredAndSortedBooks.length === 0 && !isLoading ? (
						 <p className="no-data"><FaExclamationCircle /> Tidak ada buku yang cocok dengan pencarian Anda.</p>
					 ) : (
						 <div className="book-cards-v5">
							 {filteredAndSortedBooks.map(book => (
								 <BookCardV5 key={book.id} book={book} onClick={() => onBookClick ? onBookClick(book) : navigate(`/book/${book.id}`)} />
							 ))}
							 {isLoading && books.length > 0 && <p className="loading-bar">Memperbarui data...</p>}
						 </div>
					 )}
				 </div>
			 </div>
		 </>
	 );
};

// Tambahkan type agar bisa di-import oleh komponen lain
export type Loan = import('../../services/api').LoanDto;
export type UserData = any; // Ganti dengan tipe user sebenarnya jika sudah ada
