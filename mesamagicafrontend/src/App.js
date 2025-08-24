import { useEffect, useState } from 'react';

function App() {
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch('/weatherforecast')  // Proxied to http://localhost:5000/weatherforecast
            .then(res => res.json())
            .then(setData);
    }, []);

    return (
        <div>
            <h1>Weather Data from API:</h1>
            <ul>
                {data.map((item, index) => (
                    <li key={index}>{item.summary} - {item.temperatureC}°C</li>
                ))}
            </ul>
        </div>
    );
}

export default App;
