function categorizeMerchant(merchant) {

    if (!merchant) {
        return "Other";
    }

    const value = merchant.toLowerCase();

    if (
        value.includes("swiggy") ||
        value.includes("zomato") ||
        value.includes("restaurant") ||
        value.includes("food")
    ) {
        return "Food";
    }

    if (
        value.includes("uber") ||
        value.includes("ola") ||
        value.includes("rapido")
    ) {
        return "Transportation";
    }

    if (
        value.includes("amazon") ||
        value.includes("flipkart")
    ) {
        return "Shopping";
    }

    return "Other";
}

export { categorizeMerchant };