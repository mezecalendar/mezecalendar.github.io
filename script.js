document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    const timezoneSelect = document.getElementById('timezone');

    let eventList = [];
    let originalEvents = [];
    let currentEventIndex = 0;
    let eventsOfTheDay = [];
    let currentTimezone = 'CET';
    let calendar; // Declare the calendar variable globally

    async function fetchEvents() {
        const response = await fetch('events.json');
        const events = await response.json();
        originalEvents = events.map(event => ({
            ...event,
            start: moment.tz(event.start, 'CET').toDate(),
            end: moment.tz(event.end, 'CET').toDate()
        }));
        return originalEvents;
    }

    function updateEventTimes(events, targetTimezone) {
        return events.map(event => {
            const updatedEvent = { ...event };
            updatedEvent.start = moment.tz(event.start, 'CET').tz(targetTimezone).toDate();
            updatedEvent.end = moment.tz(event.end, 'CET').tz(targetTimezone).toDate();
            return updatedEvent;
        });
    }

    function initTimezoneSelector() {
        const timezones = moment.tz.names();

        // Add CET at the top of the dropdown
        const cetOption = new Option('CET', 'CET', true, true);
        timezoneSelect.add(cetOption);

        timezones.forEach(tz => {
            if (tz !== 'CET') { // Ensure CET is not added twice
                const option = new Option(tz, tz);
                timezoneSelect.add(option);
            }
        });

        new TomSelect(timezoneSelect, {
            maxOptions: null
        });

        timezoneSelect.addEventListener('change', function() {
            currentTimezone = this.value;
            updateCalendarEvents();
        });

        // Debugging
        console.log('Timezones:', timezones);
    }

    function updateCalendarEvents() {
        const updatedEvents = updateEventTimes(originalEvents, currentTimezone);
        const currentView = calendar.view.type; // Get current view type
        const currentDate = calendar.getDate(); // Get current date

        initCalendar(updatedEvents);
        
        calendar.changeView(currentView, currentDate); // Preserve the view and date
        checkCurrentEvent();
        updateUpcomingEvents();
    }

    function openModal(event) {
        const eventDate = moment.tz(event.start, currentTimezone).format('YYYY-MM-DD');
        eventsOfTheDay = eventList.filter(e => moment.tz(e.start, currentTimezone).format('YYYY-MM-DD') === eventDate);
        currentEventIndex = eventsOfTheDay.findIndex(e => e.id === event.id);

        updateModalContent(eventsOfTheDay[currentEventIndex]);
        document.getElementById('eventModal').style.display = 'block';
    }

    function closeModal() {
        document.getElementById('eventModal').style.display = 'none';
    }

    function prevEvent() {
        currentEventIndex = (currentEventIndex - 1 + eventsOfTheDay.length) % eventsOfTheDay.length;
        updateModalContent(eventsOfTheDay[currentEventIndex]);
    }
    
    function nextEvent() {
        currentEventIndex = (currentEventIndex + 1) % eventsOfTheDay.length;
        updateModalContent(eventsOfTheDay[currentEventIndex]);
    }
    

    function updateModalContent(event) {
        const startTime = moment.tz(event.start, currentTimezone).format('hh:mm A');
        const endTime = moment.tz(event.end, currentTimezone).format('hh:mm A');
        document.getElementById('eventDate').innerText = `Events on ${event.start.toDateString()}`;
        document.getElementById('modalTitle').innerText = event.title || 'No Title';
        document.getElementById('modalDescription').innerText = `Description: ${event.extendedProps?.description || 'No Description'}`;
        document.getElementById('modalTime').innerText = `Time: ${startTime} - ${endTime}`;
    }

    function initCalendar(events) {
        eventList = events.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
        }));

        if (calendar) {
            calendar.destroy(); // Destroy the previous calendar instance
        }

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
            },
            events: eventList,
            allDayText: '',
            eventClick: function(info) {
                openModal(info.event);
            },
            eventContent: function(arg) {
                const startTime = moment.tz(arg.event.start, currentTimezone).format('hh:mm A');
                const endTime = moment.tz(arg.event.end, currentTimezone).format('hh:mm A');
                if (arg.view.type === 'dayGridMonth') {
                    return {
                        html: `<div class="fc-event-title">${arg.event.title}</div>`
                    };
                } else if (arg.view.type === 'listWeek') {
                    const duration = moment(arg.event.end).diff(moment(arg.event.start), 'hours', true);
                    if (duration > 1) {
                        return {
                            html: `<div class="fc-event-time">${startTime} - ${endTime}</div><div class="fc-event-title">${arg.event.title}</div>`,
                            className: 'merged-event'
                        };
                    }
                    return {
                        html: `<div class="fc-event-time">${startTime}</div><div class="fc-event-title">${arg.event.title}</div>`
                    };
                } else {
                    return {
                        html: `<div class="fc-event-time">${startTime}</div><div class="fc-event-title">${arg.event.title}</div>`
                    };
                }
            }
        });

        calendar.render();
    }

    function updateCurrentEvent(event) {
        if (event) {
            const startTime = moment.tz(event.start, currentTimezone).format('hh:mm A');
            const endTime = moment.tz(event.end, currentTimezone).format('hh:mm A');
            document.getElementById('currentEvent').style.display = 'block';
            document.getElementById('currentEventTitle').innerText = event.title || 'No current event';
            document.getElementById('currentEventDescription').innerText = `Description: ${event.extendedProps?.description || 'N/A'}`;
            document.getElementById('currentEventTime').innerText = event.start ? `${startTime} - ${endTime}` : 'N/A';
        } else {
            document.getElementById('currentEvent').style.display = 'block';
            document.getElementById('currentEventTitle').innerText = 'No current event';
            document.getElementById('currentEventDescription').innerText = ' N/A';
            document.getElementById('currentEventTime').innerText = 'N/A';
        }
    }

    function checkCurrentEvent() {
        const now = moment().tz(currentTimezone);
        const currentEvent = eventList.find(event => {
            const eventStart = moment.tz(event.start, currentTimezone);
            const eventEnd = moment.tz(event.end, currentTimezone);
            return eventStart <= now && now < eventEnd;
        });

        updateCurrentEvent(currentEvent);
    }

    function updateUpcomingEvents() {
        const now = moment().tz(currentTimezone);
        const upcomingEvents = eventList.filter(event => moment.tz(event.start, currentTimezone).isAfter(now));
        upcomingEvents.sort((a, b) => moment.tz(a.start, currentTimezone).diff(moment.tz(b.start, currentTimezone)));

        console.log('Upcoming Events:', upcomingEvents); // Debugging line

        updateUpcomingEventItem(upcomingEvents[0], 1);
        updateUpcomingEventItem(upcomingEvents[1], 2);
    }

    function updateUpcomingEventItem(event, index) {
        if (event) {
            const startTime = moment.tz(event.start, currentTimezone).format('YYYY-MM-DD hh:mm A');
            const endTime = moment.tz(event.end, currentTimezone).format('hh:mm A');
            const eventDate = moment.tz(event.start, currentTimezone).format('YYYY-MM-DD');
    
            updateCountdown(event, index);
    
            document.getElementById(`upcomingEventTitle${index}`).innerText = event.title || 'No upcoming event';
            document.getElementById(`upcomingEventDescription${index}`).innerText = ` ${event.extendedProps?.description || 'N/A'}`;
            document.getElementById(`upcomingEventTime${index}`).innerText = `${startTime} - ${endTime}`;
            document.getElementById(`upcomingEventDate${index}`).innerText = `${eventDate}`;
        } else {
            document.getElementById(`upcomingEventTitle${index}`).innerText = 'No upcoming event';
            document.getElementById(`upcomingEventDescription${index}`).innerText = 'N/A';
            document.getElementById(`upcomingEventTime${index}`).innerText = 'N/A';
            document.getElementById(`upcomingEventDate${index}`).innerText = 'N/A';
            document.getElementById(`upcomingEventCountdown${index}`).innerText = 'N/A';
        }
    }
    

    function updateCountdown(event, index) {
        const now = moment().tz(currentTimezone);
        const eventStart = moment.tz(event.start, currentTimezone);
        const duration = moment.duration(eventStart.diff(now));

        const hours = Math.floor(duration.asHours());
        const minutes = Math.floor(duration.minutes());
        const seconds = Math.floor(duration.seconds());

        document.getElementById(`upcomingEventCountdown${index}`).innerText = `${hours}h ${minutes}m ${seconds}s`;

        setTimeout(() => updateCountdown(event, index), 1000);
    }

    fetchEvents().then(events => {
        eventList = events;
        const updatedEvents = updateEventTimes(events, currentTimezone);
        initCalendar(updatedEvents);
        initTimezoneSelector();
        checkCurrentEvent();
        updateUpcomingEvents();
    });

    window.closeModal = closeModal;
    window.prevEvent = prevEvent;
    window.nextEvent = nextEvent;

    setInterval(checkCurrentEvent, 60000);
    setInterval(updateUpcomingEvents, 60000);

});
