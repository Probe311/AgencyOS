import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';

/**
 * Génère une URL d'avatar SVG en utilisant Dicebear localement
 * @param seed - Le seed pour générer l'avatar (email, id, nom, etc.)
 * @param backgroundColor - Couleurs de fond optionnelles (format: "color1,color2,color3")
 * @returns URL de données SVG
 */
export const generateAvatar = (seed: string, backgroundColor?: string): string => {
  const options: any = {};
  
  if (backgroundColor) {
    options.backgroundColor = backgroundColor.split(',');
  } else {
    // Couleurs par défaut similaires à l'ancienne API
    options.backgroundColor = ['b6e3f4', 'c0aede', 'd1d4f9'];
  }

  const avatar = createAvatar(notionists, {
    seed: seed || 'default',
    ...options,
  });

  return avatar.toDataUriSync();
};

/**
 * Génère une URL d'avatar pour un utilisateur
 * Utilise l'email ou l'ID comme seed
 */
export const getUserAvatar = (email?: string, id?: string): string => {
  const seed = email || id || 'default';
  return generateAvatar(seed);
};

/**
 * Génère une URL d'avatar avec des couleurs personnalisées
 */
export const getHeroImage = (id: string): string => {
  return generateAvatar(id, 'b6e3f4,c0aede,d1d4f9');
};

