import { createContext, useContext } from 'react';

/**
 * True inside a room's tab (Cursus › Grammatica, Mentis › Sermo…): the room draws the title and
 * the tabs, so the page's own PageHeader keeps only its actions.
 */
export const InRoom = createContext(false);

export const useInRoom = () => useContext(InRoom);
