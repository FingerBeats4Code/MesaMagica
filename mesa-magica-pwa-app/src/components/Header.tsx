import React from 'react';
import { useAppContext } from '@/context/AppContext';

const Header: React.FC = () => {
     const { tenantSlug } = useAppContext();
      const logoPath = tenantSlug 
    ? `https://i.ibb.co/RGhmvWty/${tenantSlug}logo.png`
    : 'https://i.ibb.co/YFbWDL1b/Mesa-Magica.png';
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = 'none';
    const nextSibling = e.currentTarget.nextSibling;
    if (nextSibling instanceof HTMLElement) {
      nextSibling.style.display = 'block';
    }
  };
    return (
        <header className="mx-auto items-center justify-between px-8 pt-10 pb-4 text-sm relative z-10 flex max-w-7xl">
            <div className="items-center flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r items-center justify-center from-orange-500 to-red-500 flex">
                     <img
            src={logoPath}
            alt={`${tenantSlug || 'MesaMagica'} logo`}
            className="w-5 h-5 object-contain"
            onError={handleImageError}
          />
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" id="Windframe_jYOcuWCDa"> <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2ZM8 16L9 19L11 17L13 19L14 16L11 14L9 14L8 16Z" /> </svg>
                </div>
                <p className="text-xl font-bold tracking-wide"> {tenantSlug || 'MesaMagica'}</p>
            </div>
            <div className="items-center flex gap-4">
                <button type="button" className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded-md">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" id="Windframe_CbPmO728j"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9M17 13v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" /> </svg>
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 items-center justify-center absolute -top-2 -right-2 flex">3</span>
                </button>
                <button type="button" className="lg:hidden">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" id="Windframe_irTwkosuw"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /> </svg>
                </button>
            </div>
        </header>
    );
};

export default Header;
