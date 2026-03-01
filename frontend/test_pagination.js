
const getPaginationRange = (current, total) => {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    // Always show first 3
    let pages = [1, 2, 3];

    // Always show last 3
    pages.push(total - 2, total - 1, total);

    // Show current and neighbors
    if (current > 1 && current < total) {
        pages.push(current - 1, current, current + 1);
    }

    // Filter out-of-bounds and sort, then unique
    pages = [...new Set(pages)].filter(p => p > 0 && p <= total).sort((a, b) => a - b);

    // Insert ellipses
    const result = [];
    for (let i = 0; i < pages.length; i++) {
        if (i > 0 && pages[i] - pages[i - 1] > 1) {
            result.push('...');
        }
        result.push(pages[i]);
    }

    return result;
};

// Test Cases
const test = (current, total) => {
    console.log(`Current: ${current}, Total: ${total} => ${getPaginationRange(current, total).join(' ')}`);
};

console.log("--- Short Lists ---");
test(1, 5);
test(3, 7);

console.log("\n--- Long Lists ---");
test(1, 100);
test(2, 100);
test(3, 100);
test(4, 100);
test(50, 100);
test(97, 100);
test(98, 100);
test(99, 100);
test(100, 100);
