/**
 * PC Doctor Standard Preset Service Checklists
 * Automatically loaded when a service is selected during repair job intake
 */
const REPAIR_TEMPLATES = {
  'Windows Installation': {
    serviceName: 'Windows Installation',
    defaultEstimatedCost: 500,
    checklist: [
      'Backup Customer Data to Safe Storage',
      'Check BIOS / UEFI settings & Boot Order',
      'Create Partition & Install Clean Windows OS',
      'Install Chipset, Graphics, Audio & WiFi Drivers',
      'Run Windows Updates to latest stable release',
      'Install Standard Utilities (Browser, PDF Reader, Zip, Media Player)',
      'Install Microsoft Office / Productivity Suite',
      'Activate Windows License & Test Audio/Video',
      'Performance Stress Test & Benchmark',
      'Final Quality Check & Wipe Device Clean'
    ]
  },
  'Windows Upgrade': {
    serviceName: 'Windows Upgrade',
    defaultEstimatedCost: 600,
    checklist: [
      'Check System Compatibility (TPM 2.0, Secure Boot, Processor)',
      'Full System Image & File Backup',
      'Clean Temporary Files & Check Disk Space',
      'Perform In-place Upgrade to Windows 11',
      'Update Motherboard BIOS & Hardware Drivers',
      'Verify User Profiles, Files & Installed Applications',
      'Run Stability & Benchmark Diagnostics',
      'Final Quality Check'
    ]
  },
  'SSD Upgrade': {
    serviceName: 'SSD Upgrade',
    defaultEstimatedCost: 800,
    checklist: [
      'Backup Customer Data & Create Recovery Image',
      'Safely Disassemble Laptop/Desktop Chassis',
      'Install M.2 NVMe / 2.5" SATA Solid State Drive',
      'Migrate/Clone Existing OS or Install Fresh OS',
      'Install Storage Controllers & AHCI/NVMe Drivers',
      'Optimize TRIM, Defrag Settings & Boot Sequence',
      'Test SSD Health & CrystalDisk Benchmark',
      'Test Cold Boot & Restart Times',
      'Reassemble Device & Final Quality Check'
    ]
  },
  'RAM Upgrade': {
    serviceName: 'RAM Upgrade',
    defaultEstimatedCost: 300,
    checklist: [
      'Inspect Motherboard Specs (Max RAM, DDR Generation & Frequency)',
      'Disassemble Chassis & Disconnect Battery',
      'Clean RAM Slots with Contact Cleaner',
      'Insert Matching High-Performance RAM Modules',
      'Verify Dual Channel Operation in BIOS',
      'Run MemTest86 / Windows Memory Diagnostic',
      'Check Task Manager for Full Available Memory',
      'Final Quality Check'
    ]
  },
  'Virus Removal': {
    serviceName: 'Virus Removal',
    defaultEstimatedCost: 450,
    checklist: [
      'Boot in Safe Mode & Analyze Running Processes',
      'Scan with Deep Offline Malware & Rootkit Scanner',
      'Remove Trojans, Adware, Browser Hijackers & Cryptominers',
      'Clear Malicious Registry Keys & Startup Items',
      'Reset Web Browsers & Clear Rogue Extensions',
      'Repair Corrupted Windows System Files (sfc /scannow & DISM)',
      'Install / Update Antivirus & Enable Firewall',
      'Perform System Speed & Responsiveness Test'
    ]
  },
  'Laptop Cleaning': {
    serviceName: 'Laptop Cleaning',
    defaultEstimatedCost: 500,
    checklist: [
      'Complete Internal Disassembly & Battery Disconnection',
      'Clear Dust & Lint from Cooling Fins & Exhaust Vents',
      'Clean Fan Blades with Antistatic Brush & Lubricate Bearing',
      'Clean Motherboard with Isopropyl Alcohol (IPA)',
      'Clean Keyboard Keys, Ports, and Speaker Grilles',
      'Clean Screen & Outer Casing with Antistatic Foam',
      'Reassemble & Verify Fan Noise & Airflow'
    ]
  },
  'Thermal Paste': {
    serviceName: 'Thermal Paste',
    defaultEstimatedCost: 400,
    checklist: [
      'Disassemble Heatsink Assembly Carefully',
      'Remove Dried Old Thermal Paste from CPU/GPU with IPA 99%',
      'Inspect Heatsink Copper Heat Pipes for Vapor Leaks',
      'Apply High-Conductivity Thermal Compound (Arctic/Thermal Grizzly)',
      'Replace Worn Thermal Pads on VRAM & VRMs',
      'Evenly Torque Heatsink Screws in Cross Pattern',
      'Run AIDA64 / FurMark Stress Test to Check Temperatures',
      'Verify Idling and Max Load Temps within safe limits'
    ]
  },
  'Battery Replacement': {
    serviceName: 'Battery Replacement',
    defaultEstimatedCost: 400,
    checklist: [
      'Verify Exact Battery Model, Voltage & Watt-Hours',
      'Safely Remove Swollen or Degraded Battery',
      'Inspect Chassis & Trackpad for Swelling Damage',
      'Install Grade-A OEM / Compatible New Battery Pack',
      'Calibrate Battery Charging Cycle (0% to 100%)',
      'Test Battery Health & Discharge Rate in BatteryReport',
      'Verify AC Adapter Handshake & Charging Speeds'
    ]
  },
  'Keyboard Replacement': {
    serviceName: 'Keyboard Replacement',
    defaultEstimatedCost: 500,
    checklist: [
      'Disconnect Battery & Remove Palmrest or Keyboard Bezel',
      'Desolder Plastic Rivets or Unscrew Keyboard Bracket',
      'Install New OEM Keyboard & Secure Rivets/Brackets',
      'Connect & Lock Ribbon Cable without Bends',
      'Test Every Single Key with Online Keyboard Tester',
      'Test Keyboard Backlight & Function Keys (Fn)',
      'Reassemble & Inspect Key Alignment'
    ]
  },
  'Screen Replacement': {
    serviceName: 'Screen Replacement',
    defaultEstimatedCost: 600,
    checklist: [
      'Disconnect Battery and Drain Residual Capacitance',
      'Remove Display Bezel with Non-Marring Pry Tools',
      'Unscrew Hinges / Adhesive Pull-Tabs',
      'Disconnect eDP 30/40 Pin Video Cable Safely',
      'Install Matching Resolution & Refresh Rate Panel',
      'Test for Dead Pixels, Backlight Bleed & Color Accuracy',
      'Test Brightness Control Keys & Lid Sensor',
      'Apply New Adhesive & Snap Bezel Securely'
    ]
  },
  'Motherboard Repair': {
    serviceName: 'Motherboard Repair',
    defaultEstimatedCost: 1500,
    checklist: [
      'Inspect Board under Microscope for Corrosion or Burn Marks',
      'Measure Primary Power Rails (19V / 20V DC-IN, 3.3V, 5V Always-On)',
      'Identify Short-Circuited Capacitors or MOSFETs with Thermal Camera',
      'Micro-solder Replacement ICs, Chokes, or Diodes',
      'Clean Flux Residue with Ultrasonic / Isopropyl Bath',
      'Measure Secondary Rails (RAM, VCORE, VCCSA, PCH)',
      'Connect Display & Test Bench POST',
      'Continuous 2-Hour Stress Test before Reassembly'
    ]
  },
  'Charging Port Repair': {
    serviceName: 'Charging Port Repair',
    defaultEstimatedCost: 600,
    checklist: [
      'Inspect DC Jack / Type-C Port Pins with Magnifier',
      'Desolder Damaged Jack using Hot Air Rework Station',
      'Wick Solder Pads Clean & Apply Quality Flux',
      'Solder Reinforced OEM Charging Port',
      'Anchor Jack with High-Strength Epoxy if Frame is Cracked',
      'Test DC Input Voltage & Current Draw on Bench Power Supply',
      'Test Charging under Load with Cable Wiggle Test'
    ]
  },
  'BIOS Update': {
    serviceName: 'BIOS Update',
    defaultEstimatedCost: 400,
    checklist: [
      'Check Existing BIOS Version & Exact Motherboard Revision',
      'Connect Machine to Uninterruptible Power Supply (UPS)',
      'Download Official BIOS Firmware & Verify Hash',
      'Flash BIOS via EZ-Flash or Hardware SPI CH341A Programmer',
      'Clear CMOS & Restore Optimal Defaults',
      'Re-enable XMP / DOCP & Secure Boot Settings',
      'Verify All Hardware Detected Correctly in BIOS & OS'
    ]
  },
  'Software Installation': {
    serviceName: 'Software Installation',
    defaultEstimatedCost: 350,
    checklist: [
      'Check Software System Requirements & Compatibility',
      'Install Required Runtimes (VC++ Redistributables, .NET, DirectX)',
      'Install Requested Application Packages Cleanly',
      'Configure User License, Workspace & Preferences',
      'Create Desktop & Start Menu Shortcuts',
      'Verify Functionality & Print Test Output if Applicable'
    ]
  },
  'Data Recovery': {
    serviceName: 'Data Recovery',
    defaultEstimatedCost: 1500,
    checklist: [
      'Inspect Storage Drive for Physical & Mechanical Sounds',
      'Check SMART Attributes & Bad Sector Counts',
      'Create Read-Only Bit-by-Bit Raw Disk Image (ddrescue)',
      'Deep Carve Files & Reconstruct File System MFT/FAT/EXT',
      'Recover Deleted, Corrupted, or Formatted Partitions',
      'Verify Integrity of Target Documents, Photos & Videos',
      'Transfer Recovered Data to Customer Storage Drive'
    ]
  },
  'Printer Repair': {
    serviceName: 'Printer Repair',
    defaultEstimatedCost: 700,
    checklist: [
      'Inspect Paper Feed Path for Torn Paper, Clips or Foreign Objects',
      'Clean or Replace Pickup Rollers with Rubber Restorer',
      'Unclog / Flush Printhead Nozzles with Cleaning Solution',
      'Inspect Ink Supply Tubes & Dampers for Air Bubbles',
      'Inspect Fuser Assembly & Heating Film on Laser Printers',
      'Lubricate Carriage Rails & Reset Waste Ink Pad Counter',
      'Print CMYK Alignment Test Page & Verify Print Quality'
    ]
  },
  'Network Setup': {
    serviceName: 'Network Setup',
    defaultEstimatedCost: 800,
    checklist: [
      'Inspect ISP Fiber ONU / Modem WAN Connection',
      'Configure Router WAN (PPPoE / Static IP / DHCP)',
      'Set Up Dual-Band SSID (2.4GHz & 5GHz) with WPA3 Security',
      'Configure IP Subnet, DHCP Pool & Custom DNS (Cloudflare/Google)',
      'Crimp Cat6 RJ45 Terminations & Test with Cable Tester',
      'Configure Port Forwarding / QoS if Required',
      'Perform Speedtest & Wi-Fi Dead Zone Signal Check'
    ]
  },
  'CCTV Installation': {
    serviceName: 'CCTV Installation',
    defaultEstimatedCost: 1200,
    checklist: [
      'Mount Cameras at Optimal Viewing Angles & Heights',
      'Route Coaxial / Cat6 Cables through Protective Conduit/Casing',
      'Install & Power 12V DC Camera SMPS Power Supply',
      'Terminate BNC / RJ45 Connectors with Water-Resistant Boots',
      'Install Surveillance Grade HDD (WD Purple / SkyHawk) into DVR/NVR',
      'Initialize HDD, Set Up 24/7 Motion-Detection Recording & Overwrite',
      'Configure Mobile App (Hik-Connect / DMSS / XMeye) for Remote Live View',
      'Adjust Camera Focus, Night Vision IR, and Motion Alerts'
    ]
  },
  'Custom Repair': {
    serviceName: 'Custom Repair',
    defaultEstimatedCost: 500,
    checklist: [
      'Perform Initial Diagnostic Assessment',
      'Record Customer Specific Complaints & Symptoms',
      'Inspect Components & Isolate Root Cause',
      'Execute Repair / Replacement Work',
      'Run Functional & Stability Quality Check',
      'Clean Device & Prepare for Customer Handover'
    ]
  }
};

/**
 * Helper to get checklist items for a given service name
 */
const getChecklistForService = (serviceName) => {
  const template = REPAIR_TEMPLATES[serviceName] || REPAIR_TEMPLATES['Custom Repair'];
  return template.checklist.map((item) => ({
    task: item,
    completed: false
  }));
};

module.exports = {
  REPAIR_TEMPLATES,
  getChecklistForService
};
