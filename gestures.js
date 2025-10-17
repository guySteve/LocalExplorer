/***************************************************************************************************
* GESTURE AND SWIPE MANAGER
*
* Handles touch and mouse events to create a swipeable interface for result cards.
* This allows users to dismiss a suggestion or add it to their day plan with a simple swipe.
***************************************************************************************************/

const GestureManager = {
    // --- Configuration ---
    SWIPE_THRESHOLD: 100, // Min pixels to move for a swipe to register
    SWIPE_MAX_VERTICAL: 75, // Max vertical movement to still be considered a horizontal swipe

    // --- State Tracking ---
    touchstartX: 0,
    touchstartY: 0,
    touchendX: 0,
    touchendY: 0,
    isDragging: false,
    activeCard: null,

    /**
     * Initializes the gesture listeners on a target element.
     * @param {HTMLElement} cardElement The card element that should be swipeable.
     */
    init: function(cardElement) {
        this.activeCard = cardElement;
        // Mouse events for desktop
        cardElement.addEventListener('mousedown', this.handleGestureStart.bind(this));
        document.addEventListener('mousemove', this.handleGestureMove.bind(this));
        document.addEventListener('mouseup', this.handleGestureEnd.bind(this));
        // Touch events for mobile
        cardElement.addEventListener('touchstart', this.handleGestureStart.bind(this));
        document.addEventListener('touchmove', this.handleGestureMove.bind(this));
        document.addEventListener('touchend', this.handleGestureEnd.bind(this));
    },

    /**
     * Records the starting position of the touch or mouse drag.
     * @param {Event} e The mousedown or touchstart event.
     */
    handleGestureStart: function(e) {
        this.isDragging = true;
        this.touchstartX = e.type === 'touchstart' ? e.changedTouches[0].screenX : e.screenX;
        this.touchstartY = e.type === 'touchstart' ? e.changedTouches[0].screenY : e.screenY;
        this.activeCard.style.transition = 'none'; // Disable transition while dragging
    },

    /**
     * Tracks the movement and applies a real-time transform to the card.
     * @param {Event} e The mousemove or touchmove event.
     */
    handleGestureMove: function(e) {
        if (!this.isDragging) return;
        
        const currentX = e.type === 'touchmove' ? e.changedTouches[0].screenX : e.screenX;
        const deltaX = currentX - this.touchstartX;
        const rotation = deltaX / 20; // Add a slight rotation for effect

        this.activeCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
    },

    /**
     * Determines the final action based on the swipe distance and direction.
     * @param {Event} e The mouseup or touchend event.
     */
    handleGestureEnd: function(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.touchendX = e.type === 'touchend' ? e.changedTouches[0].screenX : e.screenX;
        this.touchendY = e.type === 'touchend' ? e.changedTouches[0].screenY : e.screenY;
        
        const deltaX = this.touchendX - this.touchstartX;
        const deltaY = Math.abs(this.touchendY - this.touchstartY);

        this.activeCard.style.transition = 'transform 0.3s ease-out'; // Re-enable transition

        // Ignore swipe if it was mostly vertical
        if (deltaY > this.SWIPE_MAX_VERTICAL) {
             this.activeCard.style.transform = 'translateX(0) rotate(0deg)'; // Reset position
             return;
        }

        if (deltaX > this.SWIPE_THRESHOLD) {
            // Swipe Right: Add to Day Plan
            this.handleSwipe('right');
        } else if (deltaX < -this.SWIPE_THRESHOLD) {
            // Swipe Left: Dismiss / Next suggestion
            this.handleSwipe('left');
        } else {
            // Not a full swipe, snap back to center
            this.activeCard.style.transform = 'translateX(0) rotate(0deg)';
        }
    },

    /**
     * Executes the action associated with the swipe direction.
     * @param {string} direction 'left' or 'right'
     */
    handleSwipe: function(direction) {
        const flyoutDirection = direction === 'left' ? '-100vw' : '100vw';
        this.activeCard.style.transform = `translateX(${flyoutDirection}) rotate(${direction === 'left' ? -20 : 20}deg)`;

        // Use a timeout to allow the animation to complete before triggering the action
        setTimeout(() => {
            if (direction === 'right') {
                AppState.addToDayPlan(AppState.currentPlace);
                // Maybe show a quick "Added to Plan" toast message
            }
            
            // In both cases, we get the next suggestion
            // This is just a placeholder for the actual UI logic
            console.log(`Swiped ${direction}. Get next suggestion.`);
            // UI.showNextSuggestion(); 
        }, 300);
    }
};
