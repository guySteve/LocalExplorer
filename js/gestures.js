const GestureManager = {
    SWIPE_THRESHOLD: 100,
    touchstartX: 0,
    isDragging: false,
    activeCard: null,

    init: function(cardElement) {
        this.activeCard = cardElement;
        cardElement.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));
        cardElement.addEventListener('touchstart', this.handleStart.bind(this));
        document.addEventListener('touchmove', this.handleMove.bind(this));
        document.addEventListener('touchend', this.handleEnd.bind(this));
    },
    handleStart: function(e) {
        this.isDragging = true;
        this.touchstartX = e.type === 'touchstart' ? e.changedTouches[0].screenX : e.screenX;
        this.activeCard.style.transition = 'none';
    },
    handleMove: function(e) {
        if (!this.isDragging) return;
        const currentX = e.type === 'touchmove' ? e.changedTouches[0].screenX : e.screenX;
        const deltaX = currentX - this.touchstartX;
        this.activeCard.style.transform = `translateX(${deltaX}px) rotate(${deltaX / 20}deg)`;
    },
    handleEnd: function(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        const touchendX = e.type === 'touchend' ? e.changedTouches[0].screenX : e.screenX;
        const deltaX = touchendX - this.touchstartX;
        this.activeCard.style.transition = 'transform 0.3s ease-out';
        if (deltaX > this.SWIPE_THRESHOLD) this.handleSwipe('right');
        else if (deltaX < -this.SWIPE_THRESHOLD) this.handleSwipe('left');
        else this.activeCard.style.transform = 'translateX(0) rotate(0deg)';
    },
    handleSwipe: function(direction) {
        const flyout = direction === 'left' ? '-120vw' : '120vw';
        this.activeCard.style.transform = `translateX(${flyout}) rotate(${direction === 'left' ? -30 : 30}deg)`;
        setTimeout(() => {
            if (direction === 'right') {
                AppState.addToDayPlan(AppState.currentPlace);
                UI.showNotification('Added to Day Plan!');
            }
            UI.showNextSuggestion();
            this.activeCard.style.transform = 'translateX(0) rotate(0deg)';
        }, 300);
    }
};
