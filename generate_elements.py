import json

elements_raw = [
    ("Hydrogen", "Vodík", "H", 1),
    ("Helium", "Helium", "He", 6),
    ("Lithium", "Lithium", "Li", 2),
    ("Beryllium", "Beryllium", "Be", 3),
    ("Boron", "Bór", "B", 4),
    ("Carbon", "Uhlík", "C", 4),
    ("Nitrogen", "Dusík", "N", 5),
    ("Oxygen", "Kyslík", "O", 5),
    ("Fluorine", "Fluor", "F", 5),
    ("Neon", "Neon", "Ne", 6),
    ("Sodium", "Sodík", "Na", 2),
    ("Magnesium", "Hořčík", "Mg", 3),
    ("Aluminum", "Hliník", "Al", 3),
    ("Silicon", "Křemík", "Si", 4),
    ("Phosphorus", "Fosfor", "P", 5),
    ("Sulfur", "Síra", "S", 5),
    ("Chlorine", "Chlor", "Cl", 5),
    ("Argon", "Argon", "Ar", 6),
    ("Potassium", "Draslík", "K", 2),
    ("Calcium", "Vápník", "Ca", 3),
    ("Scandium", "Skandium", "Sc", 4), ("Titanium", "Titan", "Ti", 4), ("Vanadium", "Vanad", "V", 4), ("Chromium", "Chrom", "Cr", 4), ("Manganese", "Mangan", "Mn", 4), ("Iron", "Železo", "Fe", 4), ("Cobalt", "Kobalt", "Co", 4), ("Nickel", "Nikl", "Ni", 4), ("Copper", "Měď", "Cu", 4), ("Zinc", "Zinek", "Zn", 4),
    ("Gallium", "Gallium", "Ga", 3), ("Germanium", "Germanium", "Ge", 4), ("Arsenic", "Arsen", "As", 5), ("Selenium", "Selen", "Se", 5), ("Bromine", "Brom", "Br", 5),
    ("Krypton", "Krypton", "Kr", 6),
    ("Rubidium", "Rubidium", "Rb", 2), ("Strontium", "Stroncium", "Sr", 3),
    ("Yttrium", "Yttrium", "Y", 4), ("Zirconium", "Zirkonium", "Zr", 4), ("Niobium", "Niob", "Nb", 4), ("Molybdenum", "Molybden", "Mo", 4), ("Technetium", "Technecium", "Tc", 4), ("Ruthenium", "Ruthenium", "Ru", 4), ("Rhodium", "Rhodium", "Rh", 4), ("Palladium", "Palladium", "Pd", 4), ("Silver", "Stříbro", "Ag", 4), ("Cadmium", "Kadmium", "Cd", 4),
    ("Indium", "Indium", "In", 3), ("Tin", "Cín", "Sn", 4), ("Antimony", "Antimon", "Sb", 5), ("Tellurium", "Tellur", "Te", 5), ("Iodine", "Jod", "I", 5),
    ("Xenon", "Xenon", "Xe", 6),
    ("Cesium", "Cesium", "Cs", 2), ("Barium", "Baryum", "Ba", 3),
    ("Lanthanum", "Lanthan", "La", 4), ("Cerium", "Cer", "Ce", 4), ("Praseodymium", "Praseodym", "Pr", 4), ("Neodymium", "Neodym", "Nd", 4), ("Promethium", "Promethium", "Pm", 4), ("Samarium", "Samarium", "Sm", 4), ("Europium", "Europium", "Eu", 4), ("Gadolinium", "Gadolinium", "Gd", 4), ("Terbium", "Terbium", "Tb", 4), ("Dysprosium", "Dysprosium", "Dy", 4), ("Holmium", "Holmium", "Ho", 4), ("Erbium", "Erbium", "Er", 4), ("Thulium", "Thulium", "Tm", 4), ("Ytterbium", "Ytterbium", "Yb", 4), ("Lutetium", "Lutecium", "Lu", 4),
    ("Hafnium", "Hafnium", "Hf", 4), ("Tantalum", "Tantal", "Ta", 4), ("Tungsten", "Wolfram", "W", 4), ("Rhenium", "Rhenium", "Re", 4), ("Osmium", "Osmium", "Os", 4), ("Iridium", "Iridium", "Ir", 4), ("Platinum", "Platina", "Pt", 4), ("Gold", "Zlato", "Au", 4), ("Mercury", "Rtuť", "Hg", 4),
    ("Thallium", "Thallium", "Tl", 3), ("Lead", "Olovo", "Pb", 4), ("Bismuth", "Bismut", "Bi", 5), ("Polonium", "Polonium", "Po", 5), ("Astatine", "Astat", "At", 5),
    ("Radon", "Radon", "Rn", 6),
    ("Francium", "Francium", "Fr", 2), ("Radium", "Radium", "Ra", 3),
    ("Actinium", "Aktinium", "Ac", 4), ("Thorium", "Thorium", "Th", 4), ("Protactinium", "Protaktinium", "Pa", 4), ("Uranium", "Uran", "U", 4), ("Neptunium", "Neptunium", "Np", 4), ("Plutonium", "Plutonium", "Pu", 4), ("Americium", "Americium", "Am", 4), ("Curium", "Curium", "Cm", 4), ("Berkelium", "Berkelium", "Bk", 4), ("Californium", "Kalifornium", "Cf", 4), ("Einsteinium", "Einsteinium", "Es", 4), ("Fermium", "Fermium", "Fm", 4), ("Mendelevium", "Mendelevium", "Md", 4), ("Nobelium", "Nobelium", "No", 4), ("Lawrencium", "Lawrencium", "Lr", 4),
    ("Rutherfordium", "Rutherfordium", "Rf", 4), ("Dubnium", "Dubnium", "Db", 4), ("Seaborgium", "Seaborgium", "Sg", 4), ("Bohrium", "Bohrium", "Bh", 4), ("Hassium", "Hassium", "Hs", 4), ("Meitnerium", "Meitnerium", "Mt", 4), ("Darmstadtium", "Darmstadtium", "Ds", 4), ("Roentgenium", "Roentgenium", "Rg", 4), ("Copernicium", "Kopernicium", "Cn", 4),
    ("Nihonium", "Nihonium", "Nh", 3), ("Flerovium", "Flerovium", "Fl", 4), ("Moscovium", "Moscovium", "Mc", 5), ("Livermorium", "Livermorium", "Lv", 5), ("Tennessine", "Tennessine", "Ts", 5),
    ("Oganesson", "Oganesson", "Og", 6)
]

elements_json = []
for i, (name_en, name_cz, symbol, mergeReq) in enumerate(elements_raw):
    id = i + 1
    if id == 1:
        elements_json.append({"id": id, "name": {"en": name_en, "cz": name_cz}, "symbol": symbol, "baseCost": 1})
    else:
        elements_json.append({"id": id, "name": {"en": name_en, "cz": name_cz}, "symbol": symbol, "mergeReq": mergeReq})

with open('elements.json', 'w', encoding='utf-8') as f:
    json.dump(elements_json, f, indent=4, ensure_ascii=False)
