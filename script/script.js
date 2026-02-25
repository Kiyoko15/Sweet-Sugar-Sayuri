document.addEventListener('DOMContentLoaded', async function () {
    //==Global settings==
    const CONFIG = {
        translationsPath: 'script/translations/',
        defaultLang: 'pt',
        supportedLangs: ['pt', 'en', 'ja', 'zh'],
        carouselInterval: 5000,
        mobileBreakpoint: 678
    };

    //==Application status==
    let state = {
        currentLang: CONFIG.defaultLang,
        currentSlide: 0,
        carouselInterval: null,
        translations: {}
    };

    //==Cash of DOM's elements==
    const DOM = {
        slides: document.querySelectorAll('.videos_container__slide'),
        indicators: document.querySelectorAll('.videos_indicator'),
        languageBtn: document.querySelector('.nav_container__languageBtn'),
        languageOptions: document.getElementById('languageOptions'),
        navMenu: document.getElementById('navMenu'),
        menuToggle: document.getElementById('menuToggle'),
        carouselContainer: document.getElementById('carouselContainer')
    };

    //==Function to load JSON translations
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`${CONFIG.translationsPath}${lang}.json`);
            if (!response.ok) {
                throw new Error(`HTTP${response.status}: Falha ao carregar ${lang}.json`);
            }
            return await response.json();
        } catch (error) {
            console.error(`❌ Erro ao carregar traduções para '${lang}':`, error);
            if (lang !== CONFIG.defaultLang) {
                console.warn(`⚠️ Usando Fallback para ${CONFIG.defaultLang}`);
                return loadTranslations(CONFIG.defaultLang);
            }
            return {}
        }
    }

    //==Apply translation to the page==
    function applyTranslations(translations) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                //Preserve the HTML if it is necessary(ex:<strong>)
                el.innerHTML = translations[key];
            }
        });
    }

    //==Update the language button==
    function updateLanguageButton(lang) {
        if (!DOM.languageBtn) return;

        const labels = {
            pt: '🌐Português',
            en: '🌐English',
            ja: '🌐日本語',
            zh: '🌐 中文'
        };
        DOM.languageBtn.textContent = labels[lang] || '🌐Idiomas';
    }

    //==Main function to change the language==
    async function setLanguage(lang) {
        //Validates supported language
        if (!CONFIG.supportedLangs.includes(lang)) {
            console.warn(`Idioma '${lang}' não suportado. Usado ${CONFIG.defaultLang}`);
            lang = CONFIG.defaultLang;
        }

        //Load translations if they are not already cached
        if (!state.translations[lang]) {
            state.translations[lang] = await loadTranslations(lang);
        }

        //Update state and UI
        state.currentLang = lang;
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', 'ltr');

        applyTranslations(state.translations[lang]);
        updateLanguageButton(lang);
        closeLanguageMenu();

        //Save user preference
        try {
            localStorage.setItem('preferredLanguage', lang);
        } catch (e) {
            console.warn('⚠️ Não foi possível salavara preferência de idioma: ', e);

        }

        console.log(`✅ Idioma alterado para: ${lang}`);
    }
    //==Carousel videos==
    function updateCarousel() {
        if (!DOM.carouselContainer) return;

        DOM.carouselContainer.style.transform = `translateX(-${state.currentSlide * 100}%)`;

        //Update the indicators
        DOM.indicators.forEach((ind, i) => {
            ind.classList.toggle('active', i === state.currentSlide);
        });

        //Pause videos that are not visible
        DOM.slides.forEach((slide, i) => {
            const video = slide.querySelector('video');
            if (video && i !== state.currentSlide && !video.paused) {
                video.pause();
            }
        });
    };


    function nextSlide() {
        state.currentSlide = (state.currentSlide + 1) % DOM.slides.length;
        updateCarousel();
    }

    function prevSlide() {
        state.currentSlide = (state.currentSlide - 1 + DOM.slides.length) % DOM.slides.length;
        updateCarousel();
    }

    function goToSlide(index) {
        if (index >= 0 && index < DOM.slides.length) {
            state.currentSlide = index;
            updateCarousel();
        }
    }
    function startCarousel() {
        stopCarousel();
        if (DOM.slides.length > 0) {
            state.carouselInterval = setInterval(nextSlide, CONFIG.carouselInterval);
        }
    }
    function stopCarousel() {
        if (state.carouselInterval) {
            clearInterval(state.carouselInterval);
            state.carouselInterval = null;
        };
    };

    //==Menu Hamburger== 
    function toggleMenu() {
        if (!DOM.navMenu || !DOM.menuToggle) return;
        
        //Toggles the 'show' class in the menu and saves whether it is open or not
        const isOpen = DOM.navMenu.classList.toggle('show');
        //Toggle the class 'active' on the bottom
        DOM.menuToggle.classList.toggle('active');
        //Update the accessibility attribute
        DOM.menuToggle.setAttribute('aria-expanded', isOpen);
        if (isOpen) {
            addOverlay();
            trapFocus(DOM.navMenu);
        } else {
            removeOverlay();
            releaseFocusTrap(DOM.navMenu);
        }
    };

    function closeMenu() {
        if (!DOM.navMenu || !DOM.menuToggle) return;

        DOM.navMenu.classList.remove('show');
        DOM.menuToggle.classList.remove('active');
        DOM.menuToggle.setAttribute('aria-expanded', 'false');
        removeOverlay();
    };


    //==Overlay to close mobili menu==
    function addOverlay() {
        if (document.querySelector('.menu-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, .5);
            z-index: 5;
            display: none; 
        `;
        document.body.appendChild(overlay);

        //Fade in suave
        requestAnimationFrame(() => {
            overlay.style.display = 'block';
            overlay.style.opacity = '1';
            overlay.style.transition = 'opacity .3s ease';
        });
    }

    function removeOverlay() {
        const overlay = document.querySelector('.menu-overlay');
        if (!overlay) return;

        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    };
    //==Review cards-keyboard navegation==
    function setupReviewCardsNav(){
        const cards = document.querySelectorAll('.reviewList_card[data-status="approved"]');

        cards.forEach((card, index) => {
            card.setAttribute('tabindex', index === 0 ? '0' : '-1');
            card.setAttribute('role', 'article');

            card.addEventListener('click', (e) => {
                console.log('Review clicado: ', card.querySelector('.reviewList_card__name')?.textContent);
            });

            card.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' || e.key === ''){
                    e.preventDefault();
                    card.click();
                }
            });
        });

        //Navegation between cards using arrows
        document.addEventListener('keydown', (e) => {
            if(!['ArrowUp', 'ArrowDown'].includes(e.key)) return;

            const focusedCard = document.activeElement?.closest('.reviewList_card[data-status="approved"]');
            if(!focusedCard) return;

            const cardsArray = Array.from(cards);
            const currentIndex = cardsArray.indexOf(focusedCard);

            let nextIndex;
            if(e.key === 'ArrowDown'){
                nextIndex = Math.min(currentIndex +1, cardsArray.length - 1);
            } else {
                nextIndex = Math.max(currentIndex - 1, 0);
            }

            if(nextIndex !== currentIndex){
                e.preventDefault();
                cardsArray.forEach((c, i) => {
                    c.setAttribute('tabindex', i === nextIndex ? '0' : '-1');
                });
                cardsArray[nextIndex].focus();
            }
        });
    };

    //==Form keyboard Enhancements==
    function setupFormKeyboardNav(){
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){
                    e.preventDefault();
                    textarea.closest('form')?.requestSubmit();
                }
            });
        });
    };

    //==Focus trap Utilities==
    function trapFocus(element){
        const focusable = element.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"]');

        if(focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        function handleTab(e){
            if(e.key !== 'Tab') return;
            if(e.shiftKey){
                if(document.activeElement === first){
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if(document.activeElement === last){
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        element._trapHandler = handleTab;
        element.addEventListener('keydown', handleTab);
        first?.focus();

    };

    function releaseFocusTrap(element){
        if(element?._trapHandler){
            element.removeEventListener('keydown', element._trapHandler);
            delete element._trapHandler;
        }
    };

    //==Global ESC handler==
    function setupGlobalKeyboardHandlers(){
        document.addEventListener('keydown', (e) => {
            if(e.key !== 'Escape') return;

            if(DOM.languageOptions?.classList.contains('show')){
                e.preventDefault();
                closeLanguageMenu();
                DOM.languageBtn?.focus();
                return;
            }

            if(DOM.navMenu?.classList.contains('show')){
                e.preventDefault();
                closeMenu();
                DOM.menuToggle?.focus();
                return;
            }
            const overlay = document.querySelector('.menu-overlay');
            if(overlay){
                e.preventDefault();
                closeMenu();
                DOM.menuToggle?.focus();
            }
        });
    };

    //==Languages menu==
    function toggleLanguageMenu() {
        if (!DOM.languageOptions) return;

        const isOpen = DOM.languageOptions.classList.toggle('show');

        //Closes main menu on mobile when opening language
        if(isOpen){
            const firstOption = DOM.languageOptions.querySelector('[data-lang]');
            firstOption?.focus();
        }
        //Add listener while it is opened
        DOM.languageOptions._keyHandler = (e) => handleLanguageKeyNav(e);
        document.addEventListener('keydown', DOM.languageOptions._keyHandler);

        //close the mai menu in mobile
        if(window.innerWidth <= CONFIG.mobileBreakpoint){
            closeMenu();
        } else{
            //removelistener when it is closed
            if(DOM.languageOptions._keyHandler){
                document.removeEventListener('keydown', DOM.languageOptions._keyHandler);
                delete DOM.languageOptions._keyHandler;
            };
        };
    };

    //New function to navegate using keyboard
    function handleLanguageKeyNav(e){
        if(!DOM.languageOptions?.classList.contains('show')) return;

        const options = Array.from(DOM.languageOptions.querySelectorAll('[data-lang]'));
        const currentIndex = options.findIndex(btn => btn === document.activeElement);

        switch(e.key){
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % options.length;
                options[nextIndex].focus();
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + options.length) % options.length;
                options[prevIndex].focus();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if(document.activeElement?.dataset?.lang){
                    setLanguage(document.activeElement.dataset.lang);
                }
                break;
            case 'Escape':
                e.preventDefault();
                closeLanguageMenu();
                DOM.languageBtn?.focus();
                break;
        }
    }

    function closeLanguageMenu() {
        if(!DOM.languageOptions) return;

        DOM.languageOptions.classList.remove('show');
        //Remove listener if it is exist on the keyboard
        if(DOM.languageOptions._keyHandler){
            document.removeEventListener('keydown', DOM.languageOptions._keyHandler);
            delete DOM.languageOptions._keyHandler;
        }
    };

    //==Form validation==
    function setupFormValidation() {
        document.querySelectorAll('form').forEach(form => {
            //Remove the duplicated listeners is it exist
            form.removeEventListener('submit', handleFormSubmit);
            form.addEventListener('submit', handleFormSubmit);
        });
    };

    function handleFormSubmit(e) {
        const requiredFields = this.querySelectorAll('[required]');
        let isValid = true;
        let firstError = null;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = '#ff4444';
                field.setAttribute('aria-invalid', 'true');

                //Creat error message if it is not exist
                let errorMsg = field.parentNode.querySelector('.error-message');
                if (!errorMsg) {
                    errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message';
                    errorMsg.setAttribute('role', 'alert');
                    errorMsg.style.cssText = `
                        color: #ff4444;
                        font-size: .9em;
                        display: block;
                        margin-top: 6px;                        
                    `;
                    field.parentNode.appendChild(errorMsg);
                };

                //Customzed message by field type
                const messages = {
                    name: 'Por favor, informe seu nome.',
                    email: 'Por favor, informe um email válido.',
                    phone: 'Por favor, informe seu telefone.',
                    reviewFormText: 'Por favor, escreva a sua avaliação.'
                };
                errorMsg.textContent = messages[field.name] || 'Este campo é obrigatório.';

                if (!firstError) firstError = field;
            } else {
                field.style.borderColor = '#ccc';
                field.removeAttribute('aria-invalid');
                const errorMsg = field.parentNode.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            };
        });

        if (!isValid) {
            e.preventDefault();
            firstError?.focus();

            //Accessible feedback
            const alertMsg = document.createElement('div');
            alertMsg.setAttribute('role', 'alert');
            alertMsg.setAttribute('aria-live', 'assertive');
            alertMsg.style.cssText = 'position: fixed; top: 0; left: 50%; transform: translateX(-50%); background: #ff4444; color: white; padding: 12px 24px; border-radius: 8px; z-index: 100; box-shadow: 0 4px 12px rgba(0, 0, 0, .15);';
            alertMsg.textContent = 'Por favor, preencha todos os campos obrigatórios.';
            document.body.appendChild(alertMsg);

            setTimeout(() => alertMsg.remove(), 3000);
        };
    };



    //==Event Listener==
    function setupEventListeners() {
        //menu hamburger
        DOM.menuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
        //Close menu when the user chose one link
        DOM.navMenu?.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        //Language Selector
        DOM.languageBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLanguageMenu();
        });
        //Language options
        document.querySelectorAll('[data-lang]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                const lang = btn.getAttribute('data-lang');
                setLanguage(lang);
            });
        });
        //Carousel controls
        document.getElementById('prevBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            prevSlide();
            startCarousel();
        });

        document.getElementById('nextBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            nextSlide();
            startCarousel();
        });
        //Carousel indicators
        DOM.indicators.forEach(ind => {
            ind.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(ind.getAttribute('data-index'));
                goToSlide(index);
                startCarousel();
            });
        });
        //videos hover pause
        DOM.slides.forEach(slide => {
            const video = slide.querySelector('video');
            if (video) {
                video.addEventListener('mouseenter', stopCarousel);
                video.addEventListener('mouseleave', startCarousel);
            };
        });
        //Close menu when you click out of the menu
        document.addEventListener('click', (e) => {
            //Close language menu
            if (DOM.languageOptions?.classList.contains('show') && !DOM.languageOptions.contains(e.target) && !DOM.languageOptions?.contains(e.target)) {
                closeLanguageMenu();
            };

            //Close menu mobile(only in small screen)
            if (window.innerWidth <= CONFIG.mobileBreakpoint && DOM.navMenu?.classList.contains('show') && !DOM.navMenu.contains(e.target) && !DOM.menuToggle?.contains(e.target)) {
                closeMenu();
            };
        });
        //Close menu when you press ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMenu();
                closeLanguageMenu();
            };
        });
        //Reset menu and resize it
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.innerWidth > CONFIG.mobileBreakpoint) {
                    closeMenu();
                };
                closeLanguageMenu();
            }, 150);
        });

        //Pausecarousel the carousel when the tab is not visible 
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopCarousel();
            } else {
                startCarousel();
            };
        });

        //Start the navegation using the keyboard
        setupReviewCardsNav();
        setupFormKeyboardNav();
        setupGlobalKeyboardHandlers();
    };

    

    //==Start==
    async function initialize() {
        console.log('🚀 Inicializando o  Sweet Sugar Sayuri...');
        //load saved language
        // try{
        //     const savedLang = localStorage.getItem('preferredLanguage');
        //     if(savedLang && CONFIG.supportedLangs.includes(savedLang)){
        //         state.currentLang = savedLang;
        //     }
        // } catch(e){
        //     console.warn('⚠️ Não foi possível ler a preferência salva: ', e);
        // }
        state.current = CONFIG.defaultLang;
        //setting the inital language
        state.translations[state.currentLang] = await
        loadTranslations(state.currentLang);
        //Applay th initial language
        setLanguage(state.currentLang);
        //setting the event Listener
        setupEventListeners();
        //setting form validation
        setupFormValidation();
        //start acessibility by keyboard
        setupReviewCardsNav();
        setupFormKeyboardNav();
        setupGlobalKeyboardHandlers();
        //start the carousel if there is slids
        if(DOM.slides.length > 0){
            updateCarousel();
            startCarousel();
        }
        // dinamic style to error message and animations
       const style = document.createElement('style');
       style.textContent = `
            .error-message{
                color: #ff4444;
                font-size: .9em;
                display: block;
                margin-top: 6px;
                animation: shake .3s ease;
            }
            @keyframes shake{
                0%, 100%{transform: translateX(0);}
                25%{transform: translateX(-4px);}
                75%{transform: translateX(4px);}
            }
            @media(max-width: ${CONFIG.mobileBreakpoint}px){
                .nav_container__navMenu.show{
                    animation: slideDown .3s ease-out;
                }
                @keyframes slideDown{
                    from{opacity: 0; transform: translateY(-10px);}
                    to{ opacity: 1; transform: translateY(0);}
                }
            }
            /*Accessibility: a visible focus for keyboard users*/
            a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, [tabindex]:focus-visible{
                outline: 4px solid var(--medium-pink, #ff9ec6);
                outline-offset: 2px;
                box-shadow: 0 0 0 6px rgba(255, 158, 198, .25);
                z-index: 13;
            }
            /* Remove outline for mouse focus*/
            a:focus:not(:focus-visible), button:focus:not(:focus-visible){
                outline: none;
            }
            /* Review cards focus*/
            .reviewList_card[data-status="approved"]{
                cursor: pointer;
                transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease;
                border: 2px solid transparent;
            }
            .reviewList_card[data-status="approved"]:hover{
                transform: translateY(-3px);
                box-shadow: 0 0 0 4px rgba(255, 158, 198, .15);
            }
            
            .reviewList_card[data-status="approved"]:focus{
                border-color: var(--medium-pink);
                box-shadow: 0 0 0 4px rgba(255, 158, 198, .4);
            }
            
            /*Form focus enhancement*/
            input:focus, select:focus, textarea:focus{
                border-color: var(--medium-pink);
                box-shadow: 0 0 0 4px rgba(255, 158, 198, .25);
                outline: none;
            }
       `;
       document.head.appendChild(style);

       console.log(`✅ Site inicializado! Idioma: ${state.currentLang} | Slides: ${DOM.slides.length}`);
    }
    //Start whens the Dom is ready
    initialize();

});


