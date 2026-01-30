
// Add event listener for info button and legend overlay
document.addEventListener("DOMContentLoaded", () => {
  // Info button toggle
  const infoBtn = document.getElementById("infoBtn");
  const legendOverlay = document.getElementById("legendOverlay");
  const closeBtn = document.getElementById("closeBtn");

  function openLegend() {
    legendOverlay.classList.add("show");
  }

  function closeLegend() {
    legendOverlay.classList.remove("show");
  }

  if (infoBtn) {
    infoBtn.addEventListener("click", openLegend);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeLegend);
  }

  if (legendOverlay) {
    legendOverlay.addEventListener("click", function (e) {
      if (e.target === legendOverlay) closeLegend();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLegend();
  });

  // Existing loadFavorites call
  loadFavorites();
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
  const savedFavorites = JSON.parse(localStorage.getItem('favoriteBusStops')) || [];

  // Check if the bus stop is already saved
  const isAlreadyFavorite = savedFavorites.some(fav => fav.code === code);
  if (!isAlreadyFavorite) {
    favoriteBusStop = { code, name };
    savedFavorites.push(favoriteBusStop);
    localStorage.setItem('favoriteBusStops', JSON.stringify(savedFavorites));
    displayFavorites();
    showFavoriteToast();
  }
}
function removeFavorite(index) {
  const savedFavorites = JSON.parse(localStorage.getItem('favoriteBusStops')) || [];
  savedFavorites.splice(index, 1); // Remove the bus stop at the specified index
  localStorage.setItem('favoriteBusStops', JSON.stringify(savedFavorites));
  displayFavorites();
}

function loadFavorites() {
  const savedFavorites = JSON.parse(localStorage.getItem('favoriteBusStops')) || [];
  if (savedFavorites.length > 0) {
    displayFavorites();
  }
}

function displayFavorites() {
  const favoriteList = document.getElementById("favorite-list");
  favoriteList.innerHTML = "";

  const savedFavorites = JSON.parse(localStorage.getItem('favoriteBusStops')) || [];
  const lastThreeFavorites = savedFavorites.slice(-3); // Get the last three saved bus stops

  lastThreeFavorites.forEach((stop, index) => {
    const li = document.createElement("li");
    li.textContent = `${stop.name} (${stop.code})`;

    const removeButton = document.createElement("button");
    removeButton.textContent = "x"; // Button to remove favorite
    removeButton.style.marginLeft = "10px";
    removeButton.onclick = () => {
      if (confirm(`Are you sure you want to remove ${stop.name} from favorites?`)) {
        removeFavorite(index); // Remove favorite with confirmation
      }
    };

    li.appendChild(removeButton);
    li.onclick = () => {
      setActiveFavorite(li);
      fetchBusTimings(stop.code, true);
    };
    favoriteList.appendChild(li);
  });
}

// Function to set the active favorite and apply a border
function setActiveFavorite(selectedLi) {
  const listItems = document.querySelectorAll("#favorite-list li");

  // Remove border from all list items
  listItems.forEach((li) => {
    li.style.border = "none";
  });

  // Add border to the clicked list item
  selectedLi.style.border = "2px solid #5271ff"; // You can change the color or style as needed
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


function getCapacityIcon(load) {
  if (load === "SEA") return "🪑";
  if (load === "SDA") return "🧍";
  if (load === "LSD") return "🧍🧍";
  return "";
}

function getUrgencyClass(diffMins) {
  if (diffMins <= 2) return "urgent";
  if (diffMins <= 5) return "warning";
  return "safe";
}

function displayBusTimings(data, isFavorite) {
  clearTimers(); // Clear existing timers

  let busTimingsDiv;
  if (isFavorite) {
    busTimingsDiv = document.getElementById("bustimingsFav");
    document.getElementById("bustimings").innerHTML = "";
    document.getElementById("last-updated").style.display = "none";
  } else {
    busTimingsDiv = document.getElementById("bustimings");
    document.getElementById("bustimingsFav").innerHTML = "";
    document.getElementById("last-updatedFav").style.display = "none";
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
      const card = document.createElement("div");
      card.className = "bus-card";

      var arrivals = [];
      if (service.next) arrivals.push({ ...service.next, idSuffix: 'next' });
      if (service.subsequent) arrivals.push({ ...service.subsequent, idSuffix: 'sub' });
      if (service.next3) arrivals.push({ ...service.next3, idSuffix: 'next3' });

      var arrivalsHTML = "";
      arrivals.forEach((arrival, index) => {
        var sizeClass = (index === 0) ? 'large' : ((index === 1) ? 'medium' : 'small');
        var targetTime = new Date(arrival.time).getTime();
        var now = new Date().getTime();
        var diffMins = (targetTime - now) / 60000;
        var urgency = getUrgencyClass(diffMins);
        var timeId = `time-${arrival.idSuffix}-${service.no}`;

        arrivalsHTML += '<div class="arrival-item">';
        arrivalsHTML += `<span id="${timeId}" class="arrival-time ${sizeClass} ${urgency}">${formatTimeLeft(targetTime)}</span>`;
        // Group capacity and type
        arrivalsHTML += '<div class="capacity-type-group">';
        arrivalsHTML += `<span class="capacity-icon" aria-hidden="true">${getCapacityIcon(arrival.load)}</span>`;
        arrivalsHTML += `<span class="bus-type-badge">${arrival.type}</span>`;
        arrivalsHTML += '</div></div>';

        startCountdown(timeId, targetTime, sizeClass);
      });

      card.innerHTML =
        '<div class="bus-card-inner">' +
        '<div class="bus-number">' +
        '<div class="bus-number-badge">' +
        '<div>' + service.no + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="arrivals">' +
        arrivalsHTML +
        '</div>' +
        '</div>';

      busTimingsDiv.appendChild(card);
    });
  } else {
    busTimingsDiv.innerHTML = "No bus timings available.";
  }
}

function formatTimeLeft(targetTime) {
  const now = new Date().getTime();
  const timeDiff = (targetTime - now) / 1000; // Time difference in seconds

  var absDiff = Math.abs(timeDiff);
  const minutes = Math.floor(absDiff / 60);
  const seconds = Math.floor(absDiff % 60);

  const sign = timeDiff < 0 ? "-" : "";

  if (minutes === 0) return `${sign}${seconds}s`;
  return `${sign}${minutes}m ${seconds}s`;
}

function startCountdown(elementId, targetTime, sizeClass) {
  const countdownInterval = setInterval(() => {
    const element = document.getElementById(elementId);
    if (element) {
      const now = new Date().getTime();
      const timeDiff = (targetTime - now) / 1000;
      const diffMins = timeDiff / 60;

      element.textContent = formatTimeLeft(targetTime);
      // Update urgency class dynamically
      element.className = `arrival-time ${sizeClass} ${getUrgencyClass(diffMins)}`;

    } else {
      clearInterval(countdownInterval);
    }
  }, 1000); // Update every second
  activeTimers.push(countdownInterval);
}
