"use client";
import { actionTypes } from "@/constants/lead.constant";
import { leadReducer, TColumnAction } from "@/reducers/leadReducer";
import { ColumnWithLeads } from "@/types/invoiceLead";
import { User } from "@prisma/client";
import {
  createContext,
  Dispatch,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

const ColumnStateContext = createContext<ColumnWithLeads[]>([]);
const ColumnDispatchContext = createContext<Dispatch<TColumnAction<any>>>(
  () => {},
);
const CompanyUserContext = createContext<User[] | null>(null);

const SearchTermContext = createContext<string>("");

type TColumnProviderProps = {
  children: React.ReactNode;
  initialColumns: ColumnWithLeads[];
  companyUsers: User[] | null;
  searchTerm?: string;
};

export function ColumnProvider({
  children,
  initialColumns,
  companyUsers = [],
  searchTerm = "",
}: TColumnProviderProps) {
  const [state, dispatch] = useReducer<
    React.Reducer<ColumnWithLeads[], TColumnAction<any>>
  >(leadReducer, initialColumns);

  // Use a ref to track the last searchTerm to prevent unnecessary dispatches
  const lastSearchTermRef = useRef(searchTerm);
  const lastInitialColumnsRef = useRef(initialColumns);

  useEffect(() => {
    // Only dispatch if the data has actually changed
    const searchTermChanged = lastSearchTermRef.current !== searchTerm;
    const initialColumnsChanged = lastInitialColumnsRef.current !== initialColumns;
    
    if (searchTermChanged || initialColumnsChanged) {
      dispatch({ type: actionTypes.RELOAD_STATE, payload: initialColumns });
      lastSearchTermRef.current = searchTerm;
      lastInitialColumnsRef.current = initialColumns;
    }
  }, [initialColumns, searchTerm]);
  return (
    <ColumnStateContext.Provider value={state}>
      <ColumnDispatchContext.Provider value={dispatch}>
        <CompanyUserContext.Provider value={companyUsers}>
          <SearchTermContext.Provider value={searchTerm}>
            {children}
          </SearchTermContext.Provider>
        </CompanyUserContext.Provider>
      </ColumnDispatchContext.Provider>
    </ColumnStateContext.Provider>
  );
}

export function useColumnState() {
  return useContext(ColumnStateContext);
}

export function useColumnDispatch() {
  return useContext(ColumnDispatchContext);
}

export function useCompanyUsers() {
  return useContext(CompanyUserContext);
}

export function useSearchTerm() {
  return useContext(SearchTermContext);
}
