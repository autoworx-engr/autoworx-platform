"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, X, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SelectorOption {
  id: string
  label: string
  value: string
  children?: SelectorOption[]
}

interface SelectorProps {
  options: SelectorOption[]
  value?: string
  onChange: (value: string | null, option: SelectorOption | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  clearable?: boolean
  searchable?: boolean
  maxHeight?: string
}

const SelectorWithChildren: React.FC<SelectorProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  clearable = true,
  searchable = true,
  maxHeight = "200px",
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find selected option
  const findOptionByValue = (opts: SelectorOption[], val: string): SelectorOption | null => {
    for (const option of opts) {
      if (option.value === val) return option
      if (option.children) {
        const found = findOptionByValue(option.children, val)
        if (found) return found
      }
    }
    return null
  }

  const selectedOption = value ? findOptionByValue(options, value) : null

  // Filter options based on search query
  const filterOptions = (opts: SelectorOption[], query: string): SelectorOption[] => {
    if (!query) return opts

    return opts.reduce<SelectorOption[]>((filtered, option) => {
      const matchesSearch = option.label.toLowerCase().includes(query.toLowerCase())
      const filteredChildren = option.children ? filterOptions(option.children, query) : []

      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({
          ...option,
          children: filteredChildren.length > 0 ? filteredChildren : option.children,
        })
      }

      return filtered
    }, [])
  }

  const filteredOptions = filterOptions(options, searchQuery)

  // Toggle expanded state for parent items
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  // Handle option selection
  const handleOptionSelect = (option: SelectorOption) => {
    if (option.children && option.children.length > 0) {
      toggleExpanded(option.id)
    } else {
      onChange(option.value, option)
      setIsOpen(false)
      setSearchQuery("")
    }
  }

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null, null)
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Render option items recursively with proper padding
  const renderOptions = (opts: SelectorOption[], depth = 0) => {
    return opts.map((option) => (
      <div key={option.id}>
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => handleOptionSelect(option)}
        >
          <span className={`text-sm ${option.children ? "font-medium" : ""}`}>{option.label}</span>
          {option.children && option.children.length > 0 && (
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expandedItems.has(option.id) ? "rotate-180" : ""}`}
            />
          )}
        </div>
        {option.children && expandedItems.has(option.id) && (
          <div className="border-l-2 border-gray-200 ml-4 mb-2">{renderOptions(option.children, depth + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors bg-white  ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${isOpen ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center space-x-1">
          {clearable && selectedOption && (
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 p-0 hover:bg-gray-200 rounded-full"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute z-[60] w-full mt-1  bg-white border border-gray-300 rounded-md shadow-lg"
          style={{
            maxHeight,
            top: "100%",
            left: 0,
            right: 0,
          }}
        >
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              renderOptions(filteredOptions)
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SelectorWithChildren
