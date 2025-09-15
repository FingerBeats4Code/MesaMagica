import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { GlobalProvider } from './context/GlobalContext';
import { CartProvider } from './context/CartContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GlobalProvider>
            <CartProvider>
                <App />
            </CartProvider>
        </GlobalProvider>
    </React.StrictMode>,
);