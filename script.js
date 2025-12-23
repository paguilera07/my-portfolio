// ========== MAP INITIALIZATION ==========
// Initialize the map (centered on Salt Lake City)
var map = L.map('map').setView([40.7608, -111.8910], 13);

// Add the CARTO POSITRON BASEMAP
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// ========== CREDITS BUTTON & MODAL ==========
// Create custom credits button control
var CreditsButton = L.Control.extend({
    onAdd: function(map) {
        var buttonDiv = L.DomUtil.create('div', 'leaflet-control-custom-credits');
        buttonDiv.innerHTML = '<i class="fas fa-info-circle"></i> Credits';
        buttonDiv.title = 'Map credits and attribution';
        L.DomEvent.disableClickPropagation(buttonDiv);
        L.DomEvent.on(buttonDiv, 'click', openCreditsPopup);
        return buttonDiv;
    }
});

map.addControl(new CreditsButton({ position: 'bottomleft' }));

// Modal popup logic
var modal = document.getElementById("creditsPopup");
var closeBtn = document.getElementsByClassName("close-btn")[0];

function openCreditsPopup() {
    modal.style.display = "block";
}

function closeCreditsPopup() {
    modal.style.display = "none";
}

if (closeBtn) {
    closeBtn.onclick = closeCreditsPopup;
}

window.onclick = function(event) {
    if (event.target == modal) {
        closeCreditsPopup();
    }
};

// ========== SIDEBAR TOGGLE ==========
var sidebar = document.getElementById('sidebar');
var toggleBtn = document.getElementById('toggleSidebar');
var mobileMenuBtn = document.getElementById('mobileMenuBtn');

function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    
    // Update toggle button icon
    var icon = toggleBtn.querySelector('i');
    if (sidebar.classList.contains('collapsed')) {
        icon.className = 'fas fa-chevron-right';
        if (mobileMenuBtn) {
            mobileMenuBtn.querySelector('i').className = 'fas fa-bars';
        }
    } else {
        icon.className = 'fas fa-chevron-left';
        if (mobileMenuBtn) {
            mobileMenuBtn.querySelector('i').className = 'fas fa-times';
        }
    }
}

// Initialize sidebar
function initSidebar() {
    if (window.innerWidth < 769) {
        // Mobile: start collapsed
        sidebar.classList.add('collapsed');
        if (mobileMenuBtn) {
            mobileMenuBtn.style.display = 'flex';
            mobileMenuBtn.querySelector('i').className = 'fas fa-bars';
        }
    } else {
        // Desktop: start expanded
        sidebar.classList.remove('collapsed');
        if (mobileMenuBtn) {
            mobileMenuBtn.style.display = 'none';
        }
    }
}

// ========== PROJECT DATA MANAGEMENT ==========
var allProjects = [];
var filteredProjects = [];
var markersCluster;

// ========== PIN FAMILY ICONS ==========
var pinIcons = {
    parks: L.divIcon({
        html: '<div class="pin-icon parks-pin"><i class="fas fa-tree"></i></div>',
        className: 'custom-pin-icon',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -36]
    }),
    transportation: L.divIcon({
        html: '<div class="pin-icon transportation-pin"><i class="fas fa-bus"></i></div>',
        className: 'custom-pin-icon',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -36]
    }),
    zoning: L.divIcon({
        html: '<div class="pin-icon zoning-pin"><i class="fas fa-building"></i></div>',
        className: 'custom-pin-icon',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -36]
    }),
    environmental: L.divIcon({
        html: '<div class="pin-icon environmental-pin"><i class="fas fa-leaf"></i></div>',
        className: 'custom-pin-icon',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -36]
    }),
    default: L.divIcon({
        html: '<div class="pin-icon default-pin"><i class="fas fa-map-marker-alt"></i></div>',
        className: 'custom-pin-icon',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -36]
    })
};

// ========== MARKER CLUSTER GROUP ==========
markersCluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: true,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 17,
    maxClusterRadius: 60,
    iconCreateFunction: function(cluster) {
        var count = cluster.getChildCount();
        var size = count > 50 ? 'large' : count > 10 ? 'medium' : 'small';
        var dominantType = getDominantClusterType(cluster);
        var typeColor = getTypeColor(dominantType);
        
        return L.divIcon({
            html: `
                <div class="pin-cluster cluster-${size}" style="background-color: ${typeColor}">
                    <div class="cluster-count">${count}</div>
                    <div class="cluster-type">${dominantType}</div>
                </div>
            `,
            className: 'custom-cluster',
            iconSize: L.point(44, 44)
        });
    }
});

map.addLayer(markersCluster);

// ========== HELPER FUNCTIONS ==========
function getTypeColor(type) {
    var colors = {
        parks: '#2E8B57',
        transportation: '#1E90FF',
        zoning: '#FF8C00',
        environmental: '#32CD32',
        default: '#4a6491'
    };
    return colors[type] || colors.default;
}

function getDominantClusterType(cluster) {
    var types = {};
    cluster.getAllChildMarkers().forEach(marker => {
        var type = marker.options.projectType || 'default';
        types[type] = (types[type] || 0) + 1;
    });
    return Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b, 'default');
}

function createPopupContent(properties) {
    var typeColor = getTypeColor(properties.type);
    
    return `
        <div class="popup-content" style="border-left: 4px solid ${typeColor};">
            <h3 style="color: ${typeColor};">${properties.title}</h3>
            <div class="popup-meta">
                <span class="popup-type" style="background-color: ${typeColor};">${properties.type}</span>
                <span class="popup-year">${properties.year}</span>
                <span class="popup-status">${properties.status}</span>
            </div>
            <p>${properties.description}</p>
            ${properties.acres ? `<p><strong>Size:</strong> ${properties.acres} acres</p>` : ''}
            <p><strong>Client:</strong> ${properties.client}</p>
            <div class="popup-skills">
                <strong>Skills Used:</strong><br>
                ${properties.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join(' ')}
            </div>
            <a href="${properties.link}" class="project-link" target="_blank" style="background-color: ${typeColor};">
                <i class="fas fa-external-link-alt"></i> View Project Details
            </a>
        </div>
    `;
}

// ========== PROJECT RENDERING ==========
function renderProjects() {
    markersCluster.clearLayers();
    
    if (filteredProjects.length === 0) {
        updateProjectList();
        return;
    }
    
    filteredProjects.forEach(project => {
        if (!project.latlng || !Array.isArray(project.latlng)) {
            console.warn('Project missing coordinates:', project);
            return;
        }
        
        var type = project.properties.type || 'default';
        var icon = pinIcons[type] || pinIcons.default;
        
        var marker = L.marker(project.latlng, {
            icon: icon,
            title: project.properties.title,
            riseOnHover: true,
            projectType: type
        });
        
        marker.bindPopup(createPopupContent(project.properties));
        marker.projectId = project.id;
        
        marker.on('click', function() {
            highlightProjectCard(project.id);
        });
        
        markersCluster.addLayer(marker);
    });
    
    if (filteredProjects.length > 0) {
        var bounds = markersCluster.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
    
    updateProjectList();
}

function updateProjectList() {
    var projectList = document.getElementById('projectList');
    
    if (filteredProjects.length === 0) {
        projectList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marked-alt"></i>
                <h4>No projects found</h4>
                <p>Try changing your filter criteria</p>
            </div>
        `;
        return;
    }
    
    projectList.innerHTML = filteredProjects.map(project => {
        var typeColor = getTypeColor(project.properties.type);
        return `
        <div class="project-card" data-project-id="${project.id}" onclick="zoomToProject(${project.id})">
            <div class="project-header">
                <div class="project-color-indicator" style="background-color: ${typeColor}"></div>
                <h4 class="project-title">${project.properties.title}</h4>
            </div>
            <div class="project-meta">
                <span class="project-year">${project.properties.year}</span>
                <span class="project-status">${project.properties.status}</span>
            </div>
            <span class="project-type" style="background-color: ${typeColor}">
                ${project.properties.type}
            </span>
            <p class="project-desc">${project.properties.description.substring(0, 100)}...</p>
        </div>
        `;
    }).join('');
}

function updateProjectCount() {
    var countElement = document.getElementById('projectCount');
    if (countElement) {
        countElement.textContent = filteredProjects.length;
    }
}

function zoomToProject(projectId) {
    var project = filteredProjects.find(p => p.id === projectId);
    if (project && project.latlng) {
        map.setView(project.latlng, 16);
        
        markersCluster.eachLayer(function(layer) {
            if (layer.projectId === projectId) {
                if (markersCluster.getVisibleParent(layer) !== layer) {
                    var parent = markersCluster.getVisibleParent(layer);
                    if (parent && parent.spiderfy) {
                        parent.spiderfy();
                    }
                }
                layer.openPopup();
            }
        });
        
        highlightProjectCard(projectId);
    }
}

function highlightProjectCard(projectId) {
    document.querySelectorAll('.project-card').forEach(card => {
        card.classList.remove('active');
    });
    
    var selectedCard = document.querySelector(`.project-card[data-project-id="${projectId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ========== FILTER FUNCTIONALITY ==========
function setupFilters() {
    var yearFilter = document.getElementById('yearFilter');
    var typeFilter = document.getElementById('typeFilter');
    var statusFilter = document.getElementById('statusFilter');
    var clearFiltersBtn = document.getElementById('clearFilters');
    
    function applyFilters() {
        var year = yearFilter.value;
        var type = typeFilter.value;
        var status = statusFilter.value;
        
        filteredProjects = allProjects.filter(project => {
            return (year === 'all' || project.properties.year === year) &&
                   (type === 'all' || project.properties.type === type) &&
                   (status === 'all' || project.properties.status === status);
        });
        
        renderProjects();
        updateProjectCount();
    }
    
    if (yearFilter) yearFilter.addEventListener('change', applyFilters);
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            yearFilter.value = 'all';
            typeFilter.value = 'all';
            statusFilter.value = 'all';
            applyFilters();
        });
    }
}

// ========== DATA LOADING ==========
function loadGeoJSONData() {
    fetch('data/Parks_25_12_04.geojson')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load GeoJSON file');
            return response.json();
        })
        .then(data => {
            if (!data.features || !Array.isArray(data.features)) {
                throw new Error('Invalid GeoJSON format: missing features array');
            }
            
            allProjects = data.features.map((feature, index) => {
                var coords = feature.geometry.coordinates;
                if (!coords || coords.length < 2) {
                    console.warn(`Feature ${index} has invalid coordinates`);
                    coords = [-111.8910, 40.7608];
                }
                
                var type = 'parks';
                if (feature.properties && feature.properties.TYPE) {
                    var propType = feature.properties.TYPE.toLowerCase();
                    if (propType.includes('transport') || propType.includes('transit')) type = 'transportation';
                    else if (propType.includes('zoning')) type = 'zoning';
                    else if (propType.includes('environ')) type = 'environmental';
                }
                
                return {
                    id: feature.properties?.OBJECTID || feature.properties?.FID || index,
                    latlng: [coords[1], coords[0]],
                    geometry: feature.geometry,
                    properties: {
                        title: feature.properties?.NAME || feature.properties?.PARK_NAME || `Project ${index + 1}`,
                        type: type,
                        year: feature.properties?.YEAR || feature.properties?.YEAR_BUILT || '2024',
                        status: feature.properties?.STATUS || 'completed',
                        description: feature.properties?.DESCRIPTION || 
                                    `${feature.properties?.NAME || 'Project'} - Urban planning project`,
                        acres: feature.properties?.ACRES || feature.properties?.Acres,
                        link: '#',
                        client: feature.properties?.OWNER || 'City Planning Department',
                        skills: ['GIS Analysis', 'Site Planning', 'Public Engagement']
                    }
                };
            });
            
            filteredProjects = [...allProjects];
            renderProjects();
            updateProjectCount();
            setupFilters();
            
            console.log('Successfully loaded ' + allProjects.length + ' projects!');
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
            loadSampleProjects();
        });
}

function loadSampleProjects() {
    console.log('Loading sample projects for demonstration...');
    
    allProjects = [
        {
            id: 1,
            latlng: [40.7608, -111.8910],
            properties: {
                title: 'Downtown Park Redevelopment',
                type: 'parks',
                year: '2024',
                status: 'ongoing',
                description: 'Complete redesign of downtown park focusing on accessibility and sustainability.',
                acres: 12.5,
                link: '#',
                client: 'City Parks Department',
                skills: ['Public Engagement', 'Accessibility Design', 'Sustainable Materials']
            }
        },
        {
            id: 2,
            latlng: [40.7500, -111.9000],
            properties: {
                title: 'Transit Corridor Analysis',
                type: 'transportation',
                year: '2023',
                status: 'completed',
                description: 'GIS analysis of bus rapid transit corridors for improved public transportation.',
                link: '#',
                client: 'Regional Transportation Authority',
                skills: ['Network Analysis', 'Demographic Data', 'Traffic Modeling']
            }
        }
    ];
    
    filteredProjects = [...allProjects];
    renderProjects();
    updateProjectCount();
    setupFilters();
}

// ========== EVENT HANDLERS ==========
markersCluster.on('clusterclick', function (a) {
    console.log('Cluster clicked with ' + a.layer.getChildCount() + ' markers');
});

markersCluster.on('spiderfied', function (a) {
    console.log('Cluster spiderfied with ' + a.markers.length + ' markers');
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar
    initSidebar();
    
    // Add event listeners
    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 769) {
            if (mobileMenuBtn) mobileMenuBtn.style.display = 'none';
            sidebar.classList.remove('collapsed');
            if (toggleBtn) toggleBtn.querySelector('i').className = 'fas fa-chevron-left';
        } else {
            if (mobileMenuBtn) mobileMenuBtn.style.display = 'flex';
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth < 769 && 
            !sidebar.classList.contains('collapsed') &&
            !sidebar.contains(event.target) && 
            mobileMenuBtn && 
            !mobileMenuBtn.contains(event.target)) {
            toggleSidebar();
        }
    });
    
    // Set current year in footer
    var footerYear = document.querySelector('.sidebar-footer p');
    if (footerYear) {
        footerYear.textContent = `© ${new Date().getFullYear()} Paulo Aguilera`;
    }
    
    // Load data
    loadGeoJSONData();
    
    console.log("Portfolio map loaded successfully!");
});