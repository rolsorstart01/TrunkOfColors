/**
 * Global Image Error Handler
 * Automatically hides image elements or their parent containers 
 * if the source file is missing.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Select all images on the page
    const images = document.querySelectorAll('img');

    images.forEach(img => {
        img.onerror = function() {
            // Find the closest wrapper you want to hide.
            // In your code, this is usually .gallery-item or .art-card
            const container = img.closest('.gallery-item, .art-card, .image-wrapper');
            
            if (container) {
                container.style.display = 'none';
            } else {
                // Fallback: just hide the image itself if no container is found
                img.style.display = 'none';
            }
            
            console.warn(`Removed broken image: ${img.src}`);
        };
        
        // If the image was already broken before the script ran
        if (img.complete && img.naturalHeight === 0) {
            img.onerror();
        }
    });
});