/* ============================================================
   CRV IMOB — WEATHER.JS
   Clima atual e previsão de três dias via Open-Meteo
   ============================================================ */

(() => {
  'use strict';

  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-23.3556&longitude=-47.8569&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo&forecast_days=3';

  function weatherIcon(code) {
    if (code === 0) {
      return 'fa-sun';
    }

    if ([1, 2, 3].includes(code)) {
      return 'fa-cloud-sun';
    }

    if ([45, 48].includes(code)) {
      return 'fa-smog';
    }

    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
      return 'fa-cloud-rain';
    }

    if ([95, 96, 99].includes(code)) {
      return 'fa-cloud-bolt';
    }

    return 'fa-cloud';
  }

  function formatDay(date, index) {
    if (index === 0) {
      return 'Hoje';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }).format(new Date(`${date}T12:00:00`));
  }

  async function loadWeather() {
    const temperature = document.getElementById('weatherTemperature');
    const weatherDays = document.getElementById('weatherDays');

    try {
      const response = await fetch(WEATHER_URL);

      if (!response.ok) {
        throw new Error('Falha na previsão');
      }

      const data = await response.json();
      temperature.textContent = `${Math.round(data.current.temperature_2m)}°C`;

      weatherDays.innerHTML = data.daily.time.map((date, index) => `
        <article class="weather-day">
          <strong>${formatDay(date, index)}</strong>
          <i class="fa-solid ${weatherIcon(data.daily.weather_code[index])}"></i>
          <span>${Math.round(data.daily.temperature_2m_max[index])}°</span>
          <small>mín. ${Math.round(data.daily.temperature_2m_min[index])}°</small>
        </article>
      `).join('');
    } catch (error) {
      temperature.textContent = '--°C';
      weatherDays.innerHTML = `
        <div class="empty-state compact" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-cloud"></i>
          <span>Previsão indisponível agora.</span>
        </div>
      `;
    }
  }

  function initWeather() {
    const button = document.getElementById('weatherButton');
    const popover = document.getElementById('weatherPopover');

    if (!button || !popover) {
      return;
    }

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = popover.classList.toggle('is-open');

      popover.setAttribute('aria-hidden', String(!open));
      button.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('#weatherPopover') && !event.target.closest('#weatherButton')) {
        popover.classList.remove('is-open');
        popover.setAttribute('aria-hidden', 'true');
        button.setAttribute('aria-expanded', 'false');
      }
    });

    loadWeather();
  }

  window.CRV_SHELL_READY?.then((context) => {
    if (context) {
      initWeather();
    }
  });
})();

