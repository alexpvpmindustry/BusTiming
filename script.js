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
        const li = document.createElement("li");
        li.textContent = `${stop.name} (Code: ${stop.code}, Distance: ${stop.distance.toFixed(2)} km)`;
        busStopsList.appendChild(li);
    });
}
