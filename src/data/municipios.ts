// Departamentos y municipios de Nicaragua (17 departamentos + 2 regiones autónomas)
export const departamentos: string[] = [
  "Boaco", "Carazo", "Chinandega", "Chontales", "Estelí", "Granada",
  "Jinotega", "León", "Madriz", "Managua", "Masaya", "Matagalpa",
  "Nueva Segovia", "Río San Juan", "Rivas", "RACCN", "RACCS",
];

export const municipiosPorDepartamento: Record<string, string[]> = {
  "Boaco": ["Boaco", "Camoapa", "San José de los Remates", "San Lorenzo", "Santa Lucía", "Teustepe"],
  "Carazo": ["Diriamba", "Dolores", "El Rosario", "Jinotepe", "La Conquista", "La Paz de Carazo", "San Marcos", "Santa Teresa"],
  "Chinandega": ["Chichigalpa", "Chinandega", "Cinco Pinos", "Corinto", "El Realejo", "El Viejo", "Posoltega", "Puerto Morazán", "San Francisco del Norte", "San Pedro del Norte", "Santo Tomás del Norte", "Somotillo", "Villanueva"],
  "Chontales": ["Acoyapa", "Comalapa", "Cuapa", "El Coral", "Juigalpa", "La Libertad", "San Francisco de Cuapa", "San Pedro de Lóvago", "Santo Domingo", "Santo Tomás", "Villa Sandino"],
  "Estelí": ["Condega", "Estelí", "La Trinidad", "Pueblo Nuevo", "San Juan de Limay", "San Nicolás"],
  "Granada": ["Diriá", "Diriomo", "Granada", "Nandaime"],
  "Jinotega": ["El Cuá", "Jinotega", "La Concordia", "San José de Bocay", "San Rafael del Norte", "San Sebastián de Yalí", "Santa María de Pantasma", "Wiwilí de Jinotega"],
  "León": ["Achuapa", "El Jicaral", "El Sauce", "La Paz Centro", "larreynaga", "León", "Nagarote", "Quezalguaque", "Santa Rosa del Peñón", "Telica"],
  "Madriz": ["Las Sabanas", "üPalacagüina", "San José de Cusmapa", "San Juan de Río Coco", "San Lucas", "Somoto", "Telpaneca", "Totogalpa", "Yalagüina"],
  "Managua": ["Ciudad Sandino", "El Crucero", "Managua", "Mateare", "San Francisco Libre", "San Rafael del Sur", "Ticuantepe", "Tipitapa", "Villa El Carmen"],
  "Masaya": ["Catarina", "La Concepción", "Masatepe", "Masaya", "Nandasmo", "Nindirí", "Niquinohomo", "San Juan de Oriente", "Tisma"],
  "Matagalpa": ["Ciudad Darío", "El Tuma - La Dalia", "Esquipulas", "Matagalpa", "Matiguás", "Muy Muy", "Rancho Grande", "Río Blanco", "San Dionisio", "San Isidro", "San Ramón", "Sébaco", "Terrabona"],
  "Nueva Segovia": ["Ciudad Antigua", "Dipilto", "El Jícaro", "Jalapa", "Macuelizo", "Mozonte", "Murra", "Ocotal", "Quilalí", "San Fernando", "Santa María", "Wiwilí de Nueva Segovia"],
  "Río San Juan": ["El Almendro", "El Castillo", "Morrito", "San Carlos", "San Juan del Norte", "San Miguelito"],
  "Rivas": ["Altagracia", "Belén", "Buenos Aires", "Cárdenas", "Moyogalpa", "Potosí", "Rivas", "San Jorge", "San Juan del Sur", "Tola"],
  "RACCN": ["Bonanza", "Mulukukú", "Prinzapolka", "Puerto Cabezas", "Rosita", "Siuna", "Waslala", "Waspán"],
  "RACCS": ["Bluefields", "Corn Island", "Desembocadura de Río Grande", "El Ayote", "El Rama", "El Tortuguero", "Kukra Hill", "La Cruz de Río Grande", "Laguna de Perlas", "Muelle de los Bueyes", "Nueva Guinea", "Paiwas"],
};
