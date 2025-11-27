// Holiday season months (September to August)
const months = [
    'September', 'Oktober', 'November', 'December',
    'Januar', 'Februar', 'Marts', 'April',
    'Maj', 'Juni', 'Juli', 'August'
];

const EARNED_PER_MONTH = 2.08;
const EXTRA_HOLIDAYS = 5;

let currentSeasonId = null;
let allSeasons = []; // Store all seasons for validation

// Initialize the application
function init() {
    generateMonthsTable();
    loadSeasons();
}

// Load all seasons from database
async function loadSeasons() {
    try {
        const response = await fetch('/api/seasons');
        const seasons = await response.json();
        
        // Sort by start_year descending (highest on top)
        seasons.sort((a, b) => b.start_year - a.start_year);
        
        allSeasons = seasons; // Store for validation
        
        const select = document.getElementById('seasonSelect');
        select.innerHTML = '<option value="">-- Vælg en sæson --</option>';
        
        seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.id;
            option.textContent = `${season.name} (${season.start_year})`;
            select.appendChild(option);
        });
        
        // Load the most recent season by default
        if (seasons.length > 0) {
            select.value = seasons[0].id;
            await loadSeason();
        }
    } catch (error) {
        console.error('Error loading seasons:', error);
        alert('Kunne ikke indlæse sæsoner');
    }
}

// Load a specific season
async function loadSeason() {
    const select = document.getElementById('seasonSelect');
    const seasonId = select.value;
    
    if (!seasonId) {
        currentSeasonId = null;
        clearData();
        return;
    }
    
    currentSeasonId = parseInt(seasonId);
    
    try {
        // Load season details
        const seasonResponse = await fetch(`/api/seasons/${currentSeasonId}`);
        const season = await seasonResponse.json();
        
        // Set buffer
        document.getElementById('extraBuffer').value = season.buffer || 0;
        
        // Load monthly data
        const monthlyResponse = await fetch(`/api/seasons/${currentSeasonId}/monthly`);
        const monthlyData = await monthlyResponse.json();
        
        // Clear all inputs first
        months.forEach((month, index) => {
            document.getElementById(`month-${index}`).value = 0;
        });
        
        // Set saved values
        monthlyData.forEach(data => {
            const input = document.getElementById(`month-${data.month_index}`);
            if (input) {
                input.value = data.planned_holidays;
            }
        });
        
        calculate();
    } catch (error) {
        console.error('Error loading season:', error);
        alert('Kunne ikke indlæse sæson data');
    }
}

// Show new season dialog
function showNewSeasonDialog() {
    document.getElementById('newSeasonDialog').classList.remove('hidden');
    
    // Clear any previous error
    const errorElement = document.getElementById('seasonError');
    errorElement.textContent = '';
    errorElement.classList.remove('show');
    
    // Set default year to the next available year
    let nextYear = new Date().getFullYear();
    
    // Find the highest start year from existing seasons
    if (allSeasons.length > 0) {
        const maxYear = Math.max(...allSeasons.map(s => s.start_year));
        nextYear = maxYear + 1;
    }
    
    document.getElementById('seasonStartYear').value = nextYear;
    updateSeasonName();
}

// Update season name based on start year
function updateSeasonName() {
    const startYear = document.getElementById('seasonStartYear').value;
    if (startYear) {
        const endYear = parseInt(startYear) + 1;
        document.getElementById('seasonName').value = `${startYear}-${endYear}`;
    } else {
        document.getElementById('seasonName').value = '';
    }
}

// Hide new season dialog
function hideNewSeasonDialog() {
    document.getElementById('newSeasonDialog').classList.add('hidden');
    document.getElementById('seasonName').value = '';
    document.getElementById('seasonStartYear').value = '';
}

// Create new season
async function createNewSeason() {
    const name = document.getElementById('seasonName').value;
    const startYear = parseInt(document.getElementById('seasonStartYear').value);
    const errorElement = document.getElementById('seasonError');
    
    // Clear previous error
    errorElement.textContent = '';
    errorElement.classList.remove('show');
    
    if (!name || !startYear) {
        errorElement.textContent = 'Udfyld venligst alle felter';
        errorElement.classList.add('show');
        return;
    }
    
    // Check if a season with this start year already exists
    const existingSeason = allSeasons.find(s => s.start_year === startYear);
    if (existingSeason) {
        errorElement.textContent = `En sæson med startår ${startYear} eksisterer allerede: ${existingSeason.name}`;
        errorElement.classList.add('show');
        return;
    }
    
    try {
        const response = await fetch('/api/seasons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                start_year: startYear,
                buffer: 0
            })
        });
        
        const season = await response.json();
        hideNewSeasonDialog();
        
        // Reload seasons and select the new one
        await loadSeasons();
        document.getElementById('seasonSelect').value = season.id;
        await loadSeason();
    } catch (error) {
        console.error('Error creating season:', error);
        errorElement.textContent = 'Kunne ikke oprette sæson';
        errorElement.classList.add('show');
    }
}

// Delete current season
async function deleteSeason() {
    if (!currentSeasonId) {
        alert('Vælg venligst en sæson først');
        return;
    }
    
    // Show confirmation dialog
    document.getElementById('deleteConfirmDialog').classList.remove('hidden');
}

// Hide delete confirmation dialog
function hideDeleteConfirmDialog() {
    document.getElementById('deleteConfirmDialog').classList.add('hidden');
}

// Confirm and execute delete
async function confirmDelete() {
    hideDeleteConfirmDialog();
    
    try {
        await fetch(`/api/seasons/${currentSeasonId}`, {
            method: 'DELETE'
        });
        
        currentSeasonId = null;
        
        // Reload seasons without auto-selecting
        const response = await fetch('/api/seasons');
        const seasons = await response.json();
        
        // Sort by start_year descending (highest on top)
        seasons.sort((a, b) => b.start_year - a.start_year);
        
        allSeasons = seasons; // Update stored seasons
        
        const select = document.getElementById('seasonSelect');
        select.innerHTML = '<option value="">-- Vælg en sæson --</option>';
        
        seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.id;
            option.textContent = `${season.name} (${season.start_year})`;
            select.appendChild(option);
        });
        
        // Clear the form but don't auto-select any season
        clearData();
    } catch (error) {
        console.error('Error deleting season:', error);
        alert('Kunne ikke slette sæson');
    }
}

// Clear all data
function clearData() {
    document.getElementById('extraBuffer').value = 0;
    months.forEach((month, index) => {
        document.getElementById(`month-${index}`).value = 0;
    });
    calculate();
}

// Generate the months table
function generateMonthsTable() {
    const tbody = document.getElementById('monthsTable');
    tbody.innerHTML = '';
    
    months.forEach((month, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="month-name">${month}</td>
            <td class="earned">${EARNED_PER_MONTH.toFixed(2)}</td>
            <td class="earned-total" id="earned-total-${index}">0.00</td>
            <td class="earned-with-extra" id="earned-with-extra-${index}">0.00</td>
            <td>
                <input 
                    type="number" 
                    id="month-${index}" 
                    min="0" 
                    step="0.5" 
                    value="0"
                    onchange="calculate()"
                    placeholder="0"
                >
            </td>
            <td class="balance" id="balance-${index}">0.00</td>
            <td class="balance-with-extra" id="balance-with-extra-${index}">0.00</td>
            <td class="extra-used" id="extra-${index}">0.00</td>
            <td class="extra-remaining" id="extra-remaining-${index}">5.00</td>
        `;
        tbody.appendChild(row);
    });
}

// Calculate holiday balance throughout the season
function calculate() {
    const bufferInput = document.getElementById('extraBuffer');
    const buffer = parseFloat(bufferInput.value) || 0;
    let accumulatedHolidays = buffer;
    let extraHolidaysRemaining = EXTRA_HOLIDAYS;
    let runningBalance = buffer; // Track actual balance as we go
    let totalUsedForSummary = 0;
    
    months.forEach((month, index) => {
        // Add earned holidays for this month
        accumulatedHolidays += EARNED_PER_MONTH;
        runningBalance += EARNED_PER_MONTH;
        
        // Get planned holidays for this month
        const input = document.getElementById(`month-${index}`);
        const plannedHolidays = parseFloat(input.value) || 0;
        totalUsedForSummary += plannedHolidays;
        
        // Subtract planned holidays from running balance
        runningBalance -= plannedHolidays;
        
        let extraUsed = 0;
        let displayBalance = runningBalance;
        
        // If balance is negative, use extra holidays
        if (runningBalance < 0 && extraHolidaysRemaining > 0) {
            const deficit = Math.abs(runningBalance);
            extraUsed = Math.min(deficit, extraHolidaysRemaining);
            extraHolidaysRemaining -= extraUsed;
            runningBalance += extraUsed;
            displayBalance = Math.max(0, runningBalance);
        } else if (runningBalance < 0) {
            // No extra holidays left, show the deficit
            displayBalance = runningBalance;
        } else {
            displayBalance = runningBalance;
        }
        
        // Update earned total columns (after calculating extra usage)
        const earnedTotalElement = document.getElementById(`earned-total-${index}`);
        earnedTotalElement.textContent = accumulatedHolidays.toFixed(2);
        earnedTotalElement.classList.add('earned');
        
        const earnedWithExtraElement = document.getElementById(`earned-with-extra-${index}`);
        earnedWithExtraElement.textContent = (accumulatedHolidays + extraHolidaysRemaining).toFixed(2);
        earnedWithExtraElement.classList.add('earned');
        
        // Update display - show remaining regular holidays (minimum 0 if extra holidays cover it)
        const balanceElement = document.getElementById(`balance-${index}`);
        balanceElement.textContent = displayBalance.toFixed(2);
        balanceElement.classList.remove('positive', 'negative');
        balanceElement.classList.add(displayBalance >= 0 ? 'positive' : 'negative');
        
        // Calculate and display balance with extra holidays
        const balanceWithExtra = displayBalance + extraHolidaysRemaining;
        const balanceWithExtraElement = document.getElementById(`balance-with-extra-${index}`);
        balanceWithExtraElement.textContent = balanceWithExtra.toFixed(2);
        balanceWithExtraElement.classList.remove('positive', 'negative');
        balanceWithExtraElement.classList.add(balanceWithExtra >= 0 ? 'positive' : 'negative');
        
        const extraElement = document.getElementById(`extra-${index}`);
        extraElement.textContent = extraUsed.toFixed(2);
        
        const extraRemainingElement = document.getElementById(`extra-remaining-${index}`);
        extraRemainingElement.textContent = extraHolidaysRemaining.toFixed(2);
    });
    
    // Update summary
    const totalAccumulated = EARNED_PER_MONTH * months.length + buffer;
    document.getElementById('totalAccumulated').textContent = totalAccumulated.toFixed(2);
    document.getElementById('totalWithExtra').textContent = (totalAccumulated + EXTRA_HOLIDAYS).toFixed(2);
    document.getElementById('totalUsed').textContent = totalUsedForSummary.toFixed(2);
    
    const finalBalance = totalAccumulated - totalUsedForSummary;
    const remaining = finalBalance >= 0 ? finalBalance : 0;
    document.getElementById('remaining').textContent = remaining.toFixed(0);
    
    // Calculate and display remaining with extra
    const remainingWithExtra2 = remaining + extraHolidaysRemaining;
    const remainingWithExtra = (totalAccumulated + EXTRA_HOLIDAYS) - totalUsedForSummary;
    document.getElementById('remainingWithExtra').textContent = remainingWithExtra.toFixed(0);
    
    document.getElementById('extraRemaining').textContent = extraHolidaysRemaining.toFixed(2);
    
    // Save data
    saveData();
}

// Save data to database
async function saveData() {
    if (!currentSeasonId) return;
    
    try {
        // Update buffer
        const buffer = parseFloat(document.getElementById('extraBuffer').value) || 0;
        await fetch(`/api/seasons/${currentSeasonId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ buffer })
        });
        
        // Save monthly data
        for (let index = 0; index < months.length; index++) {
            const input = document.getElementById(`month-${index}`);
            const plannedHolidays = parseFloat(input.value) || 0;
            
            await fetch(`/api/seasons/${currentSeasonId}/monthly`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    month_index: index,
                    planned_holidays: plannedHolidays
                })
            });
        }
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Reset all values
function resetAll() {
    if (!currentSeasonId) {
        alert('Vælg venligst en sæson først');
        return;
    }
    
    if (confirm('Er du sikker på, at du vil nulstille alle data for denne sæson?')) {
        clearData();
        saveData();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
