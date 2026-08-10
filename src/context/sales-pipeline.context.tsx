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

const OrderByContext = createContext<"asc" | "desc" | undefined>(undefined);

type TColumnProviderProps = {
  children: React.ReactNode;
  initialColumns: ColumnWithLeads[];
  companyUsers: User[] | null;
  searchTerm?: string;
  orderBy?: "asc" | "desc" | undefined;
};

export function ColumnProvider({
  children,
  initialColumns,
  companyUsers = [],
  searchTerm = "",
  orderBy,
}: TColumnProviderProps) {
  const [state, dispatch] = useReducer(
    leadReducer as (
      state: ColumnWithLeads[],
      action: TColumnAction<unknown>,
    ) => ColumnWithLeads[],
    initialColumns,
  );

  // Use a ref to track the last searchTerm to prevent unnecessary dispatches
  const lastSearchTermRef = useRef(searchTerm);
  const lastInitialColumnsRef = useRef(initialColumns);
  const lastOrderByRef = useRef(orderBy);

  useEffect(() => {
    // Only dispatch if the data has actually changed
    const searchTermChanged = lastSearchTermRef.current !== searchTerm;
    const initialColumnsChanged =
      lastInitialColumnsRef.current !== initialColumns;
    const orderByChanged = lastOrderByRef.current !== orderBy;

    if (searchTermChanged || initialColumnsChanged || orderByChanged) {
      dispatch({ type: actionTypes.RELOAD_STATE, payload: initialColumns });
      lastSearchTermRef.current = searchTerm;
      lastInitialColumnsRef.current = initialColumns;
      lastOrderByRef.current = orderBy;
    }
  }, [initialColumns, searchTerm, orderBy]);
  console.log("orderby from context", orderBy);
  return (
    <ColumnStateContext.Provider value={state}>
      <ColumnDispatchContext.Provider value={dispatch}>
        <CompanyUserContext.Provider value={companyUsers}>
          <SearchTermContext.Provider value={searchTerm}>
            <OrderByContext.Provider value={orderBy}>
              {children}
            </OrderByContext.Provider>
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
export function useOrderBy() {
  return useContext(OrderByContext);
}
