import React from 'react';

const ErrorPage: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 text-red-500">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Error</h1>
                <p className="text-lg">Page not found or an error occurred. Please try again.</p>
            </div>
        </div>
    );
};

export default ErrorPage;