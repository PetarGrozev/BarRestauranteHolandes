import React from 'react';

const HomePage = () => {
    return (
        <section className="home">
            <div className="home-hero">
                <h1 className="home-title">Gestión sencilla de tu bar</h1>
                <p className="home-subtitle">
                    Controla pedidos, cocina y sala desde un solo panel minimalista.
                </p>
            </div>
            <div className="home-grid">
                <div className="home-card">
                    <h2>Pedidos</h2>
                    <p>Selecciona mesa y lanza pedidos en tiempo real.</p>
                    <a href="/tables" className="btn-primary">Elegir mesa</a>
                </div>
                <div className="home-card">
                    <h2>Cocina</h2>
                    <p>Ve lo que hay que preparar y marca estados.</p>
                    <a href="/kitchen" className="btn-secondary">Vista cocina</a>
                </div>
                <div className="home-card">
                    <h2>Sala</h2>
                    <p>Organiza entregas y estados en mesa.</p>
                    <a href="/staff" className="btn-secondary">Vista sala</a>
                </div>
                <div className="home-card">
                    <h2>Administración</h2>
                    <p>Gestiona productos, admins y exportes.</p>
                    <a href="/login" className="btn-ghost">Acceso interno</a>
                </div>
            </div>
        </section>
    );
};

export default HomePage;