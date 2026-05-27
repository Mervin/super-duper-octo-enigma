import json

# Basic grouping to roughly estimate "stability/electronegativity" proxy for mergeReq
# Alkali metals (Group 1) -> 2 (Highly reactive, wants to merge/lose electron easily in this abstracted sense)
# Alkaline Earth (Group 2) -> 3
# Transition Metals/Lanthanides/Actinides -> 4
# Halogens (Group 17) -> 5
# Noble Gases (Group 18) -> 6
# Others -> 3 or 4

elements_raw = [
    ("Hydrogen", "H", 1), # special
    ("Helium", "He", 6), # Noble
    ("Lithium", "Li", 2),
    ("Beryllium", "Be", 3),
    ("Boron", "B", 4),
    ("Carbon", "C", 4),
    ("Nitrogen", "N", 5),
    ("Oxygen", "O", 5),
    ("Fluorine", "F", 5),
    ("Neon", "Ne", 6),
    ("Sodium", "Na", 2),
    ("Magnesium", "Mg", 3),
    ("Aluminum", "Al", 3),
    ("Silicon", "Si", 4),
    ("Phosphorus", "P", 5),
    ("Sulfur", "S", 5),
    ("Chlorine", "Cl", 5),
    ("Argon", "Ar", 6),
    ("Potassium", "K", 2),
    ("Calcium", "Ca", 3),
    ("Scandium", "Sc", 4), ("Titanium", "Ti", 4), ("Vanadium", "V", 4), ("Chromium", "Cr", 4), ("Manganese", "Mn", 4), ("Iron", "Fe", 4), ("Cobalt", "Co", 4), ("Nickel", "Ni", 4), ("Copper", "Cu", 4), ("Zinc", "Zn", 4),
    ("Gallium", "Ga", 3), ("Germanium", "Ge", 4), ("Arsenic", "As", 5), ("Selenium", "Se", 5), ("Bromine", "Br", 5),
    ("Krypton", "Kr", 6),
    ("Rubidium", "Rb", 2), ("Strontium", "Sr", 3),
    ("Yttrium", "Y", 4), ("Zirconium", "Zr", 4), ("Niobium", "Nb", 4), ("Molybdenum", "Mo", 4), ("Technetium", "Tc", 4), ("Ruthenium", "Ru", 4), ("Rhodium", "Rh", 4), ("Palladium", "Pd", 4), ("Silver", "Ag", 4), ("Cadmium", "Cd", 4),
    ("Indium", "In", 3), ("Tin", "Sn", 4), ("Antimony", "Sb", 5), ("Tellurium", "Te", 5), ("Iodine", "I", 5),
    ("Xenon", "Xe", 6),
    ("Cesium", "Cs", 2), ("Barium", "Ba", 3),
    # Lanthanides
    ("Lanthanum", "La", 4), ("Cerium", "Ce", 4), ("Praseodymium", "Pr", 4), ("Neodymium", "Nd", 4), ("Promethium", "Pm", 4), ("Samarium", "Sm", 4), ("Europium", "Eu", 4), ("Gadolinium", "Gd", 4), ("Terbium", "Tb", 4), ("Dysprosium", "Dy", 4), ("Holmium", "Ho", 4), ("Erbium", "Er", 4), ("Thulium", "Tm", 4), ("Ytterbium", "Yb", 4), ("Lutetium", "Lu", 4),
    # Rest of period 6
    ("Hafnium", "Hf", 4), ("Tantalum", "Ta", 4), ("Tungsten", "W", 4), ("Rhenium", "Re", 4), ("Osmium", "Os", 4), ("Iridium", "Ir", 4), ("Platinum", "Pt", 4), ("Gold", "Au", 4), ("Mercury", "Hg", 4),
    ("Thallium", "Tl", 3), ("Lead", "Pb", 4), ("Bismuth", "Bi", 5), ("Polonium", "Po", 5), ("Astatine", "At", 5),
    ("Radon", "Rn", 6),
    ("Francium", "Fr", 2), ("Radium", "Ra", 3),
    # Actinides
    ("Actinium", "Ac", 4), ("Thorium", "Th", 4), ("Protactinium", "Pa", 4), ("Uranium", "U", 4), ("Neptunium", "Np", 4), ("Plutonium", "Pu", 4), ("Americium", "Am", 4), ("Curium", "Cm", 4), ("Berkelium", "Bk", 4), ("Californium", "Cf", 4), ("Einsteinium", "Es", 4), ("Fermium", "Fm", 4), ("Mendelevium", "Md", 4), ("Nobelium", "No", 4), ("Lawrencium", "Lr", 4),
    # Rest of period 7
    ("Rutherfordium", "Rf", 4), ("Dubnium", "Db", 4), ("Seaborgium", "Sg", 4), ("Bohrium", "Bh", 4), ("Hassium", "Hs", 4), ("Meitnerium", "Mt", 4), ("Darmstadtium", "Ds", 4), ("Roentgenium", "Rg", 4), ("Copernicium", "Cn", 4),
    ("Nihonium", "Nh", 3), ("Flerovium", "Fl", 4), ("Moscovium", "Mc", 5), ("Livermorium", "Lv", 5), ("Tennessine", "Ts", 5),
    ("Oganesson", "Og", 6)
]

elements_json = []
for i, (name, symbol, mergeReq) in enumerate(elements_raw):
    id = i + 1
    if id == 1:
        elements_json.append({"id": id, "name": name, "symbol": symbol, "baseCost": 1})
    else:
        elements_json.append({"id": id, "name": name, "symbol": symbol, "mergeReq": mergeReq})

print(json.dumps(elements_json, indent=4))
