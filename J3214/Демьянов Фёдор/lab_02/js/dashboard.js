document.addEventListener('DOMContentLoaded', async () => {
    // Проверка авторизации (Route Guard)
    const currentUser = window.auth.requireAuth();
    if (!currentUser) return;

    // Получение свежих данных пользователя с сервера
    let user = currentUser;
    try {
        user = await window.api.get(`/users/${currentUser.id}`);
        window.auth.setCurrentUser(user);
    } catch (e) {
        console.warn('Не удалось обновить профиль с сервера, используем локальную сессию');
    }

    // Отрисовка профиля исследователя
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userCode').textContent = `Код: ${user.code}`;
    document.getElementById('userClass').textContent = user.class || 'Cadet Class';
    document.getElementById('userAvatar').src = user.avatarUrl;

    // Дополнительный бейдж DeepSpace Member
    const deepSpaceBadge = document.getElementById('userDeepSpaceBadge');
    if (deepSpaceBadge) {
        if (user.isDeepSpaceMember) {
            deepSpaceBadge.classList.remove('d-none');
        } else {
            deepSpaceBadge.classList.add('d-none');
        }
    }

    // Привязка кнопки выхода
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        window.auth.logout();
    });

    // Инициализация тумблеров жизнеобеспечения из базы
    const gravSwitch = document.getElementById('gravSwitch');
    const foodSwitch = document.getElementById('foodSwitch');
    const dimSwitch = document.getElementById('dimSwitch');

    if (user.cabinSettings) {
        if (gravSwitch) gravSwitch.checked = !!user.cabinSettings.gravity;
        if (foodSwitch) foodSwitch.checked = !!user.cabinSettings.hypoallergenicFood;
        if (dimSwitch) dimSwitch.checked = !!user.cabinSettings.windowDimming;
    }

    // Обработка переключения тумблеров через PATCH /users/:id
    const toastElement = document.getElementById('telemetryToast');
    const toast = new bootstrap.Toast(toastElement, { delay: 2500 });
    const toastMessage = document.getElementById('toastMessage');

    async function updateCabinSetting(settingKey, isChecked, labelName, inputElement) {
        const updatedSettings = {
            ...user.cabinSettings,
            [settingKey]: isChecked
        };

        try {
            // Отправляем частичное обновление сущности
            const updatedUser = await window.api.patch(`/users/${user.id}`, {
                cabinSettings: updatedSettings
            });

            user = updatedUser;
            window.auth.setCurrentUser(updatedUser);

            const stateText = isChecked ? 'АКТИВИРОВАН' : 'ДЕАКТИВИРОВАН';
            toastMessage.textContent = `${labelName}: статус изменен на [${stateText}] и сохранен в бортовой сети.`;
            toast.show();
        } catch (error) {
            // В случае сетевого сбоя возвращаем тумблер на место
            inputElement.checked = !isChecked;
            alert('Сбой связи с сервером при попытке обновить параметры каюты');
        }
    }

    gravSwitch?.addEventListener('change', (e) => {
        updateCabinSetting('gravity', e.target.checked, 'Режим гравитации', e.target);
    });

    foodSwitch?.addEventListener('change', (e) => {
        updateCabinSetting('hypoallergenicFood', e.target.checked, 'Гипоаллергенный рацион', e.target);
    });

    dimSwitch?.addEventListener('change', (e) => {
        updateCabinSetting('windowDimming', e.target.checked, 'Затемнение иллюминатора', e.target);
    });

    // Загрузка рейсов пользователя
    const flightCard = document.getElementById('activeFlightCard');
    const noFlightsMessage = document.getElementById('noFlightsMessage');
    const tableBody = document.getElementById('bookingsTableBody');

    try {
        const bookings = await window.api.get(`/bookings?userId=${user.id}`);

        if (!bookings || bookings.length === 0) {
            // Если у кадета еще нет забронированных полетов
            if (flightCard) flightCard.classList.add('d-none');
            if (noFlightsMessage) noFlightsMessage.classList.remove('d-none');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-4 text-muted-custom fs-7">
                            Записи в бортовом журнале отсутствуют. Выберите миссию в каталоге.
                        </td>
                    </tr>
                `;
            }
            return;
        }

        // Берем последний актуальный рейс для большого талона
        const activeBooking = bookings[bookings.length - 1];

        if (flightCard) {
            flightCard.classList.remove('d-none');
            if (noFlightsMessage) noFlightsMessage.classList.add('d-none');

            document.getElementById('flightCodeHeader').textContent = `Ближайший рейс // ${activeBooking.tourCode}`;
            document.getElementById('flightStatusBadge').textContent = activeBooking.status || 'Подтвержден';
            document.getElementById('flightOriginCode').textContent = activeBooking.origin || 'EAR';
            document.getElementById('flightOriginName').textContent = activeBooking.originName || 'Земля (КК)';
            document.getElementById('flightDestCode').textContent = activeBooking.destination || 'ENC';
            document.getElementById('flightDestName').textContent = activeBooking.destinationName || 'База';
            document.getElementById('flightCountdown').textContent = activeBooking.countdown || activeBooking.date;
            document.getElementById('flightGate').textContent = activeBooking.gate || 'Шлюз A-12';
            document.getElementById('flightCabin').textContent = activeBooking.cabin || 'Модуль 1';

            // Наполнение модального окна посадочного сертификата
            document.getElementById('modalFlightTitle').textContent = `${activeBooking.origin} → ${activeBooking.destination}`;
            document.getElementById('modalPassenger').textContent = user.name;
            document.getElementById('modalUserId').textContent = user.code;
            document.getElementById('modalGate').textContent = activeBooking.gate || 'Gateway A-12';
            document.getElementById('modalCabin').textContent = activeBooking.cabin || 'Секция 4F';
            document.getElementById('modalSerialNo').textContent = `SERIAL NO: ${activeBooking.serialNo || 'NT-2026-DEFAULT'}`;
        }

        // Рендер таблицы бортового журнала
        if (tableBody) {
            tableBody.innerHTML = bookings.map(b => `
                <tr class="border-bottom border-secondary border-opacity-25">
                    <td class="py-3 text-main">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-rocket-takeoff text-secondary"></i>
                            <span>${b.route || (b.origin + ' → ' + b.destination)}</span>
                        </div>
                    </td>
                    <td class="py-3 text-muted-custom fs-7">${b.date}</td>
                    <td class="py-3 text-main fs-7">${b.ship || 'Nova Shuttle'}</td>
                    <td class="py-3 text-end">
                        <span class="${b.statusBadge || 'badge-gold'} px-2 py-1 fs-7 rounded">${b.status || 'Оформлен'}</span>
                    </td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error('Ошибка загрузки рейсов:', err);
    }
});