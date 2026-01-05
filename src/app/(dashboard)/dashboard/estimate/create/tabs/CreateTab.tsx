"use client";

import ItemSelector from "@/components/ItemSelector";
import { SelectTags } from "@/components/Lists/SelectTags";
import ResponsiveEstimateCreateTab from "@/components/mobile-responsive/estimate/ResponsiveEstimateCreateTab";
import { cn } from "@/lib/cn";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import { Decimal } from "decimal.js";
import { CirclePlus, CircleX } from "lucide-react";
import { create } from "mutative";
import { nanoid } from "nanoid";
import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";

export function CreateTab() {
  const { items, removeMaterial } = useEstimateCreateStore();
  const { open, close } = useEstimatePopupStore();

  const isMax640 = useMediaQuery({ query: "(max-width: 640px)" });

  const services = useListsStore((x) => x.services);
  const materials = useListsStore((x) => x.materials);
  const labors = useListsStore((x) => x.labors);

  // dropdown state
  const [dropdownsOpen, setDropdownsOpen] = useState({
    SERVICE: [-1, -1],
    MATERIAL: [-1, -1],
    LABOR: [-1, -1],
    TAG: [-1, -1],
  });

  // Helper function to add a service
  const addService = () => {
    useEstimateCreateStore.setState((x) => ({
      items: [
        ...x.items,
        {
          id: nanoid(),
          service: null,
          materials: [null],
          labor: null,
          tags: [],
          serviceDesc: "",
        },
      ],
    }));

    // After adding, ensure it's visible on Safari by scrolling to bottom
    if (isMax640) {
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  };

  // Force layout calculations after item changes on iOS Safari
  useEffect(() => {
    if (isMax640 && items.length > 0) {
      setTimeout(() => {
        window.scrollTo(window.scrollX, window.scrollY);
      }, 10);
    }
  }, [items.length, isMax640]);

  return (
    <>
      <div className="-mx-8">
        {isMax640 ? (
          <ResponsiveEstimateCreateTab />
        ) : (
          <table className="w-full border-separate border-spacing-x-8 border-spacing-y-5">
            <thead>
              <tr>
                {["Services", "Materials/Parts", "Labor", "Tags"].map((x) => (
                  <th key={x}>{x}</th>
                ))}
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={`item-${i}`}>
                  {["service", "materials", "labor", "tags"].map(
                    (itemKey, j) => {
                      switch (itemKey) {
                        case "service":
                          return (
                            <td key={itemKey + i}>
                              <ItemSelector
                                key={itemKey + i}
                                type="SERVICE"
                                label="Service"
                                item={item}
                                list={[...services]
                                  .filter(
                                    (service) =>
                                      service?.name &&
                                      service.name.trim() !== ""
                                  )
                                  .reverse()}
                                display="name"
                                onEdit={() =>
                                  open("SERVICE", {
                                    itemId: item.id,
                                    edit: true,
                                    service: item.service,
                                    serviceDesc: item.serviceDesc,
                                  })
                                }
                                onSelect={(service) =>
                                  useEstimateCreateStore.setState((x) =>
                                    create(x, (x) => {
                                      x.items[i].service = service;
                                    })
                                  )
                                }
                                onSearch={(search) => {
                                  const validServices = services.filter(
                                    (service) =>
                                      service?.name &&
                                      service.name.trim() !== ""
                                  );

                                  if (search) {
                                    return validServices.filter((service) =>
                                      service.name
                                        .toLowerCase()
                                        .includes(search.toLowerCase())
                                    );
                                  }
                                  return validServices;
                                }}
                                onDelete={() => {
                                  useEstimateCreateStore.setState((x) => {
                                    // set the service to null
                                    const items = x.items.map((item, index) => {
                                      if (index === i) {
                                        return { ...item, service: null };
                                      }
                                      return item;
                                    });
                                    return { items };
                                  });

                                  close();
                                }}
                                index={[i, j]}
                                dropdownsOpen={dropdownsOpen}
                                setDropdownsOpen={setDropdownsOpen}
                              />
                            </td>
                          );
                        case "materials":
                          return item.materials.length >= 0 ? (
                            <td className="relative" key={`materials-${j}`}>
                              {item.materials.length > 0 &&
                                item.materials.map((material, j) => (
                                  <div
                                    className={cn("mt-2.5", j === 0 && "mt-0")}
                                    key={`material-${j}`}
                                  >
                                    <ItemSelector
                                      key={`material-${j}`}
                                      type="MATERIAL"
                                      label="Materials/Parts"
                                      item={item}
                                      list={[...materials].reverse()}
                                      display="name"
                                      alwaysShowDeleteButton={
                                        item.materials.length > 1 && j > 0
                                      }
                                      materialIndex={j}
                                      onDelete={() => {
                                        removeMaterial({
                                          itemIndex: i,
                                          materialIndex: j,
                                        });
                                        close();
                                      }}
                                      onEdit={() => {
                                        open("MATERIAL", {
                                          itemId: item.id,
                                          edit: true,
                                          material,
                                          materialIndex: j,
                                        });
                                      }}
                                      onSelect={(material) => {
                                        useEstimateCreateStore.setState((x) =>
                                          create(x, (x) => {
                                            x.items[i].materials[j] = {
                                              ...material,
                                              quantity: Decimal(0),
                                            };
                                          })
                                        );

                                        open("MATERIAL", {
                                          itemId: item.id,
                                          edit: true,
                                          material: {
                                            ...material,
                                            quantity: 0,
                                          },
                                          materialIndex: j,
                                        });
                                      }}
                                      onSearch={(search) => {
                                        if (search) {
                                          const filteredMaterials =
                                            materials.filter((material) =>
                                              material.name
                                                .toLowerCase()
                                                .includes(search.toLowerCase())
                                            );
                                          return filteredMaterials;
                                        } else {
                                          return materials;
                                        }
                                      }}
                                      index={[i, j]}
                                      dropdownsOpen={dropdownsOpen}
                                      setDropdownsOpen={setDropdownsOpen}
                                    />

                                    {/* Check if this is the last material */}
                                    {/* Add new material button */}
                                    {j === item.materials.length - 1 ? (
                                      <button
                                        type="button"
                                        className="absolute flex items-center gap-1 text-sm text-[#6571FF]"
                                        onClick={() => {
                                          useEstimateCreateStore.setState((x) =>
                                            create(x, (x) => {
                                              x.items[i].materials.push(null);
                                            })
                                          );
                                        }}
                                      >
                                        <CirclePlus size="1.2em" /> Add More
                                      </button>
                                    ) : null}
                                  </div>
                                ))}

                              {item.materials.length == 0 && (
                                <div
                                  className={cn("mt-2.5", j === 0 && "mt-0")}
                                  key={`material-${j}`}
                                >
                                  <ItemSelector
                                    key={`material-${j}`}
                                    type="MATERIAL"
                                    label="Materials/Parts"
                                    item={item}
                                    list={[...materials].reverse()}
                                    display="name"
                                    alwaysShowDeleteButton={
                                      item.materials.length > 1 && j > 0
                                    }
                                    materialIndex={j}
                                    onDelete={() => {
                                      removeMaterial({
                                        itemIndex: i,
                                        materialIndex: j,
                                      });
                                    }}
                                    // onEdit={() => {}}
                                    onSelect={(material) => {
                                      useEstimateCreateStore.setState((x) =>
                                        create(x, (x) => {
                                          x.items[i].materials[j] = {
                                            ...material,
                                            quantity: Decimal(0),
                                          };
                                        })
                                      );

                                      open("MATERIAL", {
                                        itemId: item.id,
                                        edit: true,
                                        material: { ...material, quantity: 0 },
                                        materialIndex: j,
                                      });
                                    }}
                                    onSearch={(search) => {
                                      if (search) {
                                        const filteredMaterials =
                                          materials.filter((material) =>
                                            material.name
                                              .toLowerCase()
                                              .includes(search.toLowerCase())
                                          );
                                        return filteredMaterials;
                                      } else {
                                        return materials;
                                      }
                                    }}
                                    index={[i, j]}
                                    dropdownsOpen={dropdownsOpen}
                                    setDropdownsOpen={setDropdownsOpen}
                                  />

                                  {/* Check if this is the last material */}
                                  {/* Add new material button */}
                                  {j === item.materials.length - 1 ? (
                                    <button
                                      type="button"
                                      className="absolute -bottom-6 left-0 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider text-[#6571FF] transition-all hover:bg-[#6571FF]/10 active:scale-95"
                                      onClick={() => {
                                        useEstimateCreateStore.setState((x) =>
                                          create(x, (x) => {
                                            x.items[i].materials.push(null);
                                          })
                                        );
                                      }}
                                    >
                                      <CirclePlus size={16} strokeWidth={2.5} /> Add More
                                    </button>
                                  ) : null}
                                </div>
                              )}
                            </td>
                          ) : (
                            <td key={`materials-${j}`}></td>
                          );
                        case "labor":
                          return (
                            <td key={`labor-${j}`}>
                              <ItemSelector
                                type="LABOR"
                                label="Labor"
                                item={item}
                                list={[...labors].reverse()}
                                display="name"
                                onEdit={() =>
                                  open("LABOR", {
                                    itemId: item.id,
                                    edit: true,
                                    labor: item.labor,
                                  })
                                }
                                onSelect={(labor) => {
                                  useEstimateCreateStore.setState((x) =>
                                    create(x, (x) => {
                                      x.items[i].labor = {
                                        ...labor,
                                        hours: new Decimal(0),
                                      };
                                    })
                                  );

                                  open("LABOR", {
                                    itemId: item.id,
                                    edit: true,
                                    labor: {
                                      ...labor,
                                      hours: new Decimal(0),
                                    },
                                  });
                                }}
                                onSearch={(search) => {
                                  if (search) {
                                    const filteredLabors = labors.filter(
                                      (labor) =>
                                        labor.name
                                          .toLowerCase()
                                          .includes(search.toLowerCase())
                                    );

                                    return filteredLabors;
                                  } else {
                                    return labors;
                                  }
                                }}
                                onDelete={() => {
                                  useEstimateCreateStore.setState((x) => {
                                    // set the labor to null
                                    const items = x.items.map((item, index) => {
                                      if (index === i) {
                                        return { ...item, labor: null };
                                      }
                                      return item;
                                    });
                                    return { items };
                                  });
                                  close();
                                }}
                                index={[i, j]}
                                dropdownsOpen={dropdownsOpen}
                                setDropdownsOpen={setDropdownsOpen}
                              />
                            </td>
                          );
                        case "tags":
                          return (
                            <td key={`tags-${j}`}>
                              <SelectTags
                                type="TAG"
                                value={item.tags}
                                setValue={(tags) => {
                                  useEstimateCreateStore.setState((x) =>
                                    create(x, (x) => {
                                      x.items[i].tags =
                                        tags instanceof Function
                                          ? tags(item.tags)
                                          : tags;
                                    })
                                  );
                                }}
                                index={[i, j]}
                                dropdownsOpen={dropdownsOpen}
                                setDropdownsOpen={setDropdownsOpen}
                              />
                            </td>
                          );
                      }
                    }
                  )}
                  <td>
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-90"
                      onClick={() => {
                        useEstimateCreateStore.setState((x) => ({
                          items: items.toSpliced(i, 1),
                        }));
                      }}
                    >
                      <CircleX size={20} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex py-3 md:gap-52 md:bg-slate-50/80 md:backdrop-blur-sm border-t border-slate-100 px-4 md:px-6">
        <button
          type="button"
          className="sticky bottom-4 z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold tracking-wide text-[#6571FF] shadow-lg shadow-[#6571FF]/10 ring-1 ring-[#6571FF]/20 transition-all hover:bg-[#6571FF] hover:text-white active:scale-95 md:static md:w-auto md:bg-transparent md:p-2 md:shadow-none md:ring-0 md:hover:bg-[#6571FF]/10 md:hover:text-[#6571FF]"
          onClick={addService}
        >
          <CirclePlus size={20} strokeWidth={2.5} />
          <span className="uppercase tracking-wider text-[11px] md:text-sm md:capitalize md:tracking-normal">
            Add Service
          </span>
        </button>
      </div>
    </>
  );
}
