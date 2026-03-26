const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmpjUNUG6maC6axZCmlqZAZfliKM390mMd7Hrh7pYhEFhfqACUURtRayTdwMHV445xHZnl04sMOTEo/pub?output=csv"; 
const waNumber = "5493794009480";

const productListEl = document.getElementById('product_list');
const categoryFiltersEl = document.getElementById('category_filters');
const searchInput = document.getElementById('search_input');
const searchToggle = document.getElementById('search_toggle');
const searchContainer = document.getElementById('search_container');
const emptyStateEl = document.getElementById('empty_state');

const modalEl = document.getElementById('product_detail_modal');
const modalContentEl = document.getElementById('modal_content');
const modalWaContainerEl = document.getElementById('modal_whatsapp_container');
const closeModalBtn = document.getElementById('close_modal');
const modalOverlay = document.getElementById('modal_overlay');

const zoomModalEl = document.getElementById('image_zoom_modal');
const zoomedImageEl = document.getElementById('zoomed_image');
const closeZoomBtn = document.getElementById('close_zoom_modal');

let currentCategory = "Todos";
let currentSearch = "";
let products = []; 
let categories = ["Todos"];

function init() {
    lucide.createIcons();
    setupEventListeners();
    loadCatalogFromSheets();
}

async function loadCatalogFromSheets() {
    try {
        productListEl.innerHTML = '<p class="text-white/60 text-center py-10 font-medium">Cargando inventario...</p>';
        
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error("Error en la red");
        
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                products = results.data.map((item, index) => ({
                    id: index,
                    category: item['Categoria'] || item['Categoría'] || 'General',
                    name: item['Producto'] || item['Nombre'] || 'Producto',
                    
                    // CORRECCIÓN 1: Fallback extendido para las especificaciones
                    specs: item['Especificacion'] || item['Especificación'] || item['Specs'] || item['Descripcion'] || item['Descripción'] || '',
                    
                    price: parseFloat(String(item['Precio'] || item['Precio (USD)'] || '0').replace(/\$/g, '').replace(/,/g, '').trim() || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    
                    // CORRECCIÓN 2: Restauramos la imagen principal que se había borrado
                    imgPreview: item['ImagenPreview'] || item['Imagen Preview'] || item['Imagen'] || 'img/productos/placeholder.jpg', 
                    
                    gallery: [
                        item['ImagenDetalle1'],
                        item['ImagenDetalle2']
                    ].filter(img => img && img.trim() !== "")
                }));

                const uniqueCats = new Set(products.map(p => p.category));
                categories = ["Todos", ...Array.from(uniqueCats)];

                renderCategories();
                renderProducts();
            }
        });
    } catch (error) {
        console.error("Fallo al cargar:", error);
        productListEl.innerHTML = '<p class="text-red-400 text-center py-10">Error al cargar el catálogo.</p>';
    }
}

function setupEventListeners() {
    searchToggle.addEventListener('click', toggleSearch);
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderProducts();
    closeZoomBtn.addEventListener('click', closeImageZoom);
    zoomModalEl.addEventListener('click', (e) => {
        // Cierra el zoom si haces clic fuera de la imagen (en el fondo negro)
        if (e.target === zoomModalEl) closeImageZoom();
        });
    });

    closeModalBtn.addEventListener('click', closeProductDetail);
    modalOverlay.addEventListener('click', closeProductDetail);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!zoomModalEl.classList.contains('hidden')) {
                closeImageZoom();
            } else if (!modalEl.classList.contains('hidden')) {
                closeProductDetail();
            }
        }
    });
}

function toggleSearch() {
    const isHidden = searchContainer.classList.contains('hidden');
    if (isHidden) {
        searchContainer.classList.remove('hidden');
        gsap.fromTo(searchContainer, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.3, ease: "power2.out" });
        searchInput.focus();
    } else {
        gsap.to(searchContainer, { height: 0, opacity: 0, duration: 0.2, ease: "power2.in", onComplete: () => {
            searchContainer.classList.add('hidden');
            searchInput.value = '';
            currentSearch = '';
            renderProducts();
        }});
    }
}

function renderCategories() {
    categoryFiltersEl.innerHTML = categories.map(cat => {
        const isActive = cat === currentCategory;
        return `
            <button data-category="${cat}" class="category-btn whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isActive ? 'bg-white text-[#0B0E33]' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}">
                ${cat}
            </button>
        `;
    }).join('');

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentCategory = e.target.getAttribute('data-category');
            renderCategories();
            renderProducts();
        });
    });
}

function renderProducts() {
    let filtered = products;

    if (currentCategory !== "Todos") {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    if (currentSearch.trim() !== "") {
        const searchRegex = new RegExp(currentSearch, 'i');
        filtered = filtered.filter(p => searchRegex.test(p.name) || searchRegex.test(p.specs) || searchRegex.test(p.category));
    }

    if (filtered.length === 0) {
        productListEl.innerHTML = '';
        emptyStateEl.classList.remove('hidden');
        emptyStateEl.classList.add('flex');
    } else {
        emptyStateEl.classList.add('hidden');
        emptyStateEl.classList.remove('flex');
        
        productListEl.innerHTML = filtered.map(p => {
            return `
                <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col transform transition-transform shadow-xl">
                    
                    <div onclick="openProductDetail(${p.id})" class="relative w-full h-56 bg-black/20 flex items-center justify-center p-6 cursor-pointer group">
                        <span class="absolute top-3 left-3 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-bold tracking-wider text-white uppercase border border-white/10 z-10">
                            ${p.category}
                        </span>
                        
                        <img src="${p.imgPreview}" alt="${p.name}" class="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110">
                    </div>
                    
                    <div class="p-5 flex flex-col gap-2">
                        <h2 class="font-archivo italic text-xl text-white leading-tight normal-case">${p.name}</h2>
                        <p class="text-sm text-white/50 font-medium line-clamp-1">${p.specs}</p>
                        
                        <div class="flex items-center justify-between mt-3 pt-4 border-t border-white/10">
                            <span class="font-archivo italic text-2xl text-white tracking-tight">$${p.price}</span>
                            
                            <button onclick="openProductDetail(${p.id})" class="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl border border-white/10 transition-colors">
                                Ver Detalles
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
        
        gsap.fromTo(productListEl.children, 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "all" }
        );
    }
}

function openProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // 1. Preparar las imágenes (Carrusel Horizontal Deslizable)
    const allImages = [product.imgPreview, ...product.gallery];

    let imagesHtml = `
<div class="flex overflow-x-auto snap-x snap-mandatory gap-4 mb-2 pb-3 custom-scrollbar scroll-smooth">            ${allImages.map(img => `
            <div onclick="openImageZoom('${img}')" class="w-full shrink-0 snap-center aspect-square rounded-2xl overflow-hidden border border-white/10 p-6 bg-white/5 flex items-center justify-center cursor-zoom-in hover:bg-white/10 transition-colors active:scale-95">
                <img src="${img}" alt="${product.name}" class="max-w-full max-h-full object-contain drop-shadow-xl pointer-events-none">
            </div>
            `).join('')}
        </div>
    `;

    if (allImages.length > 1) {
        imagesHtml += `<p class="text-center text-xs text-white/40 mb-4 uppercase tracking-widest font-semibold animate-pulse">⟵ Desliza para ver más ⟶</p>`;
    } else {
        imagesHtml += `<div class="mb-4"></div>`; 
    }

    modalContentEl.innerHTML = `
        ${imagesHtml}
        <span class="inline-block px-2.5 py-1 bg-white/10 rounded-lg text-xs font-semibold tracking-wider text-white/80 uppercase mb-2">
            ${product.category}
        </span>
        <h2 class="font-archivo italic text-2xl text-white mb-2 leading-tight">${product.name}</h2>
        
        ${product.specs && product.specs.trim() !== '' ? `
        <div class="mt-4 pt-4 border-t border-white/10">
            <h4 class="text-sm font-semibold text-white/90 mb-2">Especificaciones Técnicas:</h4>
            <p class="text-sm text-white/70 font-normal leading-relaxed whitespace-pre-line">${product.specs}</p>
        </div>
        ` : ''}
        
        <div class="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <span class="text-xs text-white/50">Precio (USD)</span>
            <span class="font-archivo italic text-3xl price-text tracking-tight">$${product.price}</span>
        </div>
    `;

    const waMsg = `Hola Tech Ctes, quisiera consultar disponibilidad del producto: ${product.name} - ${product.specs}`;
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;
    
    // BOTÓN DEL MODAL CORREGIDO CON SVG INLINE
    modalWaContainerEl.innerHTML = `
        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="w-full btn-whatsapp text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <svg class="w-6 h-6 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            <span>Consultar por WhatsApp</span>
        </a>
    `;

    modalEl.classList.remove('hidden');
    lucide.createIcons(); 

    gsap.fromTo(modalEl.querySelector('.glass-card'),
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
    );
    gsap.fromTo(modalOverlay,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
    );
}

function closeProductDetail() {
    gsap.to(modalEl.querySelector('.glass-card'), {
        y: 50,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in"
    });
    gsap.to(modalOverlay, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
            modalEl.classList.add('hidden');
        }
    });
}

// --- LÓGICA DEL ZOOM DE IMÁGENES ---
function openImageZoom(imgSrc) {
    zoomedImageEl.src = imgSrc;
    zoomModalEl.classList.remove('hidden');
    zoomModalEl.classList.add('flex');
    
    // Renderizamos el icono de cerrar
    lucide.createIcons();

    // Animación suave de entrada
    gsap.to(zoomModalEl, { opacity: 1, duration: 0.3, ease: "power2.out" });
    gsap.to(zoomedImageEl, { scale: 1, duration: 0.4, ease: "back.out(1.5)" });
}

function closeImageZoom() {
    // Animación de salida
    gsap.to(zoomModalEl, { opacity: 0, duration: 0.3 });
    gsap.to(zoomedImageEl, { scale: 0.95, duration: 0.3, onComplete: () => {
        zoomModalEl.classList.add('hidden');
        zoomModalEl.classList.remove('flex');
        zoomedImageEl.src = ''; // Limpiamos la imagen
    }});
}

// Exponemos la función al HTML
window.openImageZoom = openImageZoom;
window.openProductDetail = openProductDetail;
document.addEventListener('DOMContentLoaded', init);