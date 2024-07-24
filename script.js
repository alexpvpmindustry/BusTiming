document.addEventListener("DOMContentLoaded", () => {
    loadFavorite();
});

function getLocation() {
    if (navigator.geolocation) {
        document.getElementById("loader").style.display = "block";
        navigator.geolocation.getCurrentPosition(fetchBusStops, showError);
    } else {
        document.getElementById("busstops").innerHTML = "Geolocation is not supported by this browser.";
    }
}

function showError(error) {
    document.getElementById("loader").style.display = "none";
    document.getElementById("loaderFav").style.display = "none";
    switch (error.code) {
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
        document.getElementById("loader").style.display = "none";
        document.getElementById("busstops").innerHTML = "Geolocation updated.";
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
        document.getElementById("loader").style.display = "none";
        document.getElementById("busstops").innerHTML = "<b>Failed to fetch bus stops data.<\b>";
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

let activeElement = null;
let favoriteBusStop = null;

function displayBusStops(busStops) {
    const busStopsList = document.getElementById("busstops");
    busStopsList.innerHTML = "";
    busStops.forEach(stop => {
        const li = document.createElement("li");
        li.textContent = `${stop.name} (${stop.code}, Dist: ${(stop.distance * 1000).toFixed(0)}m)`;
        li.onclick = () => {
            if (activeElement) {
                activeElement.classList.remove("active");
            }
            li.classList.add("active");
            activeElement = li;
            fetchBusTimings(stop.code, false);
            updateLastUpdated();
        };
        li.oncontextmenu = (e) => {
            e.preventDefault();
            saveFavorite(stop.code, stop.name);
        };
        busStopsList.appendChild(li);
    });
}

function saveFavorite(code, name) {
    favoriteBusStop = { code, name };
    localStorage.setItem('favoriteBusStop', JSON.stringify(favoriteBusStop));
    displayFavorite();
    showFavoriteToast();
}

function loadFavorite() {
    const savedFavorite = localStorage.getItem('favoriteBusStop');
    if (savedFavorite) {
        favoriteBusStop = JSON.parse(savedFavorite);
        displayFavorite();
    }
}

function displayFavorite() {
    const favoriteList = document.getElementById("favorite-list");
    favoriteList.innerHTML = "";
    if (favoriteBusStop) {
        const li = document.createElement("li");
        li.textContent = `${favoriteBusStop.name} (${favoriteBusStop.code})`;
        li.onclick = () => fetchBusTimings(favoriteBusStop.code, true);
        favoriteList.appendChild(li);
    }
}

function showFavoriteToast() {
    const toast = document.getElementById("favorite-toast");
    toast.className = "toast show";
    setTimeout(() => {
        toast.className = toast.className.replace("show", "");
    }, 3000); // Hide the toast after 3 seconds
}

function updateLastUpdated() {
    const lastUpdatedDiv = document.getElementById("last-updated");
    const now = new Date();
    lastUpdatedDiv.textContent = `Last updated: ${now.toLocaleString()}`;
    lastUpdatedDiv.style.display = "inline";
}
function updateLastUpdatedFav() {
    const lastUpdatedDiv = document.getElementById("last-updatedFav");
    const now = new Date();
    lastUpdatedDiv.textContent = `Last updated: ${now.toLocaleString()}`;
    lastUpdatedDiv.style.display = "inline";
}

async function fetchBusTimings(busStopId, isFavorite) {
    try {
        if (isFavorite) {
            document.getElementById("loaderFav").style.display = "block";
        } else {
            document.getElementById("loader").style.display = "block";
        }
        const url = `https://arrivelah2.busrouter.sg/?id=${busStopId}`;
        const response = await fetch(url);
        const data = await response.json();
        if (isFavorite) {
            document.getElementById("loaderFav").style.display = "none";
        } else {
            document.getElementById("loader").style.display = "none";
        }
        displayBusTimings(data, isFavorite);
        if (isFavorite) {
            updateLastUpdatedFav();
        } else {
            updateLastUpdated();
        }
    } catch (error) {
        document.getElementById("loader").style.display = "none";
        document.getElementById("loaderFav").style.display = "none";
        document.getElementById("bustimings").innerHTML = "<b>Failed to fetch bus timings.</b>";
    }
}

function displayBusTimings2(data, isFavorite) {
    let busTimingsDiv;
    if (isFavorite) {
        busTimingsDiv = document.getElementById("bustimingsFav");
    } else {
        busTimingsDiv = document.getElementById("bustimings");
    }

    busTimingsDiv.innerHTML = "";

    if (data.services && data.services.length > 0) {
        // Sort the bus services in ascending order by bus service number
        data.services.sort((a, b) => {
            const aNumber = parseInt(a.no.replace(/\D/g, ''), 10);
            const bNumber = parseInt(b.no.replace(/\D/g, ''), 10);
            return aNumber - bNumber;
        });

        data.services.forEach(service => {
            const serviceDiv = document.createElement("div");
            serviceDiv.innerHTML = `<div class="busservicetext">Bus:${service.no}</div>`;
            serviceDiv.innerHTML += `<div class="bustimingtext">`
            if (service.next || service.subsequent || service.next3) {
                if (service.next) {
                    const nextArrival = new Date(service.next.time).toLocaleTimeString();
                    serviceDiv.innerHTML += `<b>${nextArrival}</b>,${service.next.load},${service.next.type}.`;
                }

                if (service.subsequent) {
                    const subsequentArrival = new Date(service.subsequent.time).toLocaleTimeString();
                    serviceDiv.innerHTML += ` ${subsequentArrival},${service.subsequent.load},${service.subsequent.type}.`;
                }

                if (service.next3) {
                    const next3Arrival = new Date(service.next3.time).toLocaleTimeString();
                    serviceDiv.innerHTML += ` ${next3Arrival},${service.next3.load},${service.next3.type}.`;
                }
            }
            busTimingsDiv.appendChild(serviceDiv);
        });
    } else {
        busTimingsDiv.innerHTML = "No bus timings available.";
    }
}

let activeTimers = [];

function clearTimers() {
    activeTimers.forEach(timer => clearInterval(timer));
    activeTimers = [];
}

function displayBusTimings(data, isFavorite) {
    clearTimers(); // Clear existing timers

    let busTimingsDiv;
    if (isFavorite) {
        busTimingsDiv = document.getElementById("bustimingsFav");
    } else {
        busTimingsDiv = document.getElementById("bustimings");
    }

    busTimingsDiv.innerHTML = "";

    if (data.services && data.services.length > 0) {
        // Sort the bus services in ascending order by bus service number
        data.services.sort((a, b) => {
            const aNumber = parseInt(a.no.replace(/\D/g, ''), 10);
            const bNumber = parseInt(b.no.replace(/\D/g, ''), 10);
            return aNumber - bNumber;
        });

        data.services.forEach(service => {
            const serviceDiv = document.createElement("div");
            serviceDiv.className = "bus-service";
            serviceDiv.innerHTML = `<div class="busservicetext">Bus Service: ${service.no}</div>`;

            let timingsHTML = '';

            if (service.next) {
                const nextArrival = new Date(service.next.time).getTime();
                const textfront = "<b>";
                const load = formatSeat(service.next.load);
                const textback = `</b> <span style="opacity:0.8">(${load},${service.next.type})</span>`;
                timingsHTML += `<span id="next-${service.no}">${textfront}${formatTimeLeft(nextArrival)}${textback}</span>`;
                startCountdown(`next-${service.no}`, nextArrival, textfront, textback);
            }

            if (service.subsequent) {
                const subsequentArrival = new Date(service.subsequent.time).getTime();
                const textfront = "";
                const load = formatSeat(service.subsequent.load);
                const textback = ` <span style="opacity:0.8">(${load},${service.subsequent.type})</span>`;
                timingsHTML += ` | <span id="subsequent-${service.no}">${textfront}${formatTimeLeft(subsequentArrival)}${textback}</span>`;
                startCountdown(`subsequent-${service.no}`, subsequentArrival, textfront, textback);
            }

            if (service.next3) {
                const next3Arrival = new Date(service.next3.time).getTime();
                const textfront = "";
                const load = formatSeat(service.next3.load);
                const textback = ` <span style="opacity:0.8">(${load},${service.next3.type})</span>`;
                timingsHTML += ` | <span id="next3-${service.no}">${textfront}${formatTimeLeft(next3Arrival)}${textback}</span>`;
                startCountdown(`next3-${service.no}`, next3Arrival, textfront, textback);
            }

            serviceDiv.innerHTML += `<div class="bustimingtext">${timingsHTML}</div>`;
            busTimingsDiv.appendChild(serviceDiv);
        });
    } else {
        busTimingsDiv.innerHTML = "No bus timings available.";
    }
}
function formatSeat(seattype){
    if (seattype=="SEA"){
        return `<span style="color:green">${seattype}</span>`;
    }
    if (seattype=="SDA"){
        return `<span style="color:orange">${seattype}</span>`;
    }
    if (seattype=="LSD"){
        return `<span style="color:red">${seattype}</span>`;
    }
    return seattype;
}
function formatTimeLeft(targetTime) {
    const now = new Date().getTime();
    const timeDiff = (targetTime - now) / 1000; // Time difference in seconds

    if (timeDiff < -600) { // If time is less than -10 minutes
        return "NA";
    }
    const minutes = Math.floor(timeDiff / 60);
    const seconds = Math.abs(Math.floor(timeDiff % 60));
    if(minutes <= -1){
        const min2 = minutes+1;
        if(minutes==-1){
            return `-${min2}m${seconds}s`;
        }
        return `${min2}m${seconds}s`;
    }
    return `${minutes}m${seconds}s`;
}

function startCountdown(elementId, targetTime, textfront, textback) {
    const countdownInterval = setInterval(() => {
        const element = document.getElementById(elementId);
        if (element) {
            const now = new Date().getTime();
            const timeDiff = (targetTime - now) / 1000;

            if (timeDiff < -600) { // If time is less than -10 minutes, stop the countdown
                element.innerHTML = "NA";
                clearInterval(countdownInterval);
            } else {
                element.innerHTML = textfront + formatTimeLeft(targetTime) + textback;
            }
        } else {
            clearInterval(countdownInterval);
        }
    }, 1000); // Update every second
    activeTimers.push(countdownInterval); // Add to active timers
}
