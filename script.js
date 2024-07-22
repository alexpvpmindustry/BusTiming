function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchBusStops, showError);
    } else {
        document.getElementById("busstops").innerHTML = "Geolocation is not supported by this browser.";
    }
}

function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            document.getElementById("busstops").innerHTML = "User denied the request for Geolocation.";
            break;
        case error.POSITION_UNAVAILABLE:
            document.getElementById("busstops").innerHTML = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            document.getElementById("busstops").innerHTML = "The request to get user location timed out.";
            break;
        case error.UNKNOWN_ERROR:
            document.getElementById("busstops").innerHTML = "An unknown error occurred.";
            break;
    }
}

async function fetchBusStops(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    try {
        const response = await fetch('https://data.busrouter.sg/v1/stops.min.json');
        const busStops = await response.json();
        const busStopsArray = Object.keys(busStops).map(key => ({
            code: key,
            name: busStops[key][2],
            latitude: busStops[key][1],
            longitude: busStops[key][0]
        }));

        const sortedBusStops = busStopsArray.map(stop => ({
            ...stop,
            distance: calculateDistance(latitude, longitude, stop.latitude, stop.longitude)
        })).sort((a, b) => a.distance - b.distance);

        displayBusStops(sortedBusStops.slice(0, 10));
    } catch (error) {
        document.getElementById("busstops").innerHTML = "Failed to fetch bus stops data.";
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function displayBusStops(busStops) {
    const busStopsList = document.getElementById("busstops");
    busStopsList.innerHTML = "";
    busStops.forEach(stop => {
        const li = document.createElement("button");
        li.textContent = `${stop.name} (${stop.code}, Dist: ${stop.distance.toFixed(2)} km)`;
        li.onclick = () => fetchBusTimings(stop.code);
        busStopsList.appendChild(li);
        const div = document.createElement("div");
        busStopsList.appendChild(div);
    });
}
let counter =0;
async function fetchBusTimings(busStopId) {
    try {
        url = `https://arrivelah2.busrouter.sg/?id=${busStopId}`;
        const response = await fetch(url);
        console.log(url);
        const data = await response.json();
        displayBusTimings(data);
    } catch (error) {
        counter+=1;
        document.getElementById("bustimings").innerHTML = "Failed to fetch bus timings."+counter;
    }
}

function displayBusTimings(data) {
    const busTimingsDiv = document.getElementById("bustimings");
    busTimingsDiv.innerHTML = "";

    if (data.services && data.services.length > 0) {
        data.services.forEach(service => {
            const serviceDiv = document.createElement("div");
            serviceDiv.innerHTML = `<h3>Bus Service: ${service.no}</h3>`;

            if (service.next) {
                const nextArrival = new Date(service.next.time).toLocaleTimeString();
                serviceDiv.innerHTML += `<p>Next Arrival: ${nextArrival}, Load: ${service.next.load}, Feature: ${service.next.feature}, Type: ${service.next.type}</p>`;
            }

            if (service.subsequent) {
                const subsequentArrival = new Date(service.subsequent.time).toLocaleTimeString();
                serviceDiv.innerHTML += `<p>Subsequent Arrival: ${subsequentArrival}, Load: ${service.subsequent.load}, Feature: ${service.subsequent.feature}, Type: ${service.subsequent.type}</p>`;
            }

            if (service.next2) {
                const next2Arrival = new Date(service.next2.time).toLocaleTimeString();
                serviceDiv.innerHTML += `<p>Next 2 Arrival: ${next2Arrival}, Load: ${service.next2.load}, Feature: ${service.next2.feature}, Type: ${service.next2.type}</p>`;
            }

            if (service.next3) {
                const next3Arrival = new Date(service.next3.time).toLocaleTimeString();
                serviceDiv.innerHTML += `<p>Next 3 Arrival: ${next3Arrival}, Load: ${service.next3.load}, Feature: ${service.next3.feature}, Type: ${service.next3.type}</p>`;
            }

            busTimingsDiv.appendChild(serviceDiv);
        });
    } else {
        busTimingsDiv.innerHTML = "No bus timings available.";
    }
}