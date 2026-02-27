"use client";
import LaborCreate from "@/app/(dashboard)/dashboard/estimate/create/LaborCreate";
import MaterialCreate from "@/app/(dashboard)/dashboard/estimate/create/MaterialCreate";
import ServiceCreate from "@/app/(dashboard)/dashboard/estimate/create/ServiceCreate";
import ItemSelector from "@/components/ItemSelector";
import { SelectTags } from "@/components/Lists/SelectTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import { create } from "mutative";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import MobileItemSelector from "@/components/MobileItemSelector";
import Decimal from "decimal.js";
import { CirclePlus, CircleX } from "lucide-react";

type TProps = {};

export default function ResponsiveEstimateCreateTab({ }: TProps) {
  const { items, removeMaterial } = useEstimateCreateStore();

  const {
    open: originalOpen,
    type,
    close: originalClose,
  } = useEstimatePopupStore();
  const services = useListsStore((x) => x.services);
  const materials = useListsStore((x) => x.materials);
  const labors = useListsStore((x) => x.labors);

  // Store the scroll position and clicked element position
  const [scrollState, setScrollState] = useState({
    lastPosition: 0,
    elementPosition: 0,
  });

  const [dropdownsOpen, setDropdownsOpen] = useState({
    SERVICE: [-1, -1],
    MATERIAL: [-1, -1],
    LABOR: [-1, -1],
    TAG: [-1, -1],
  });

  const isMax640 = useMediaQuery({ query: "(max-width: 640px)" });
  const Selector = isMax640 ? MobileItemSelector : ItemSelector;

  // Enhanced open function that captures both scroll and element positions
  const open = (...args: Parameters<typeof originalOpen>) => {
    const currentScroll = window.scrollY;

    // Store both positions
    setScrollState({
      lastPosition: currentScroll,
      elementPosition: currentScroll,
    });

    // Scroll to modal position
    window.scrollTo({
      top: 350,
      behavior: "smooth",
    });

    originalOpen(...args);
  };

  // Enhanced close function that restores exact scroll position
  const close = () => {
    // Use requestAnimationFrame to ensure smooth scroll after modal closes
    requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollState.lastPosition,
        behavior: "smooth",
      });
    });

    originalClose();
  };

  // Override the popup store functions
  useEffect(() => {
    useEstimatePopupStore.setState({
      open,
      close,
    });

    return () => {
      useEstimatePopupStore.setState({
        open: originalOpen,
        close: originalClose,
      });
    };
  }, [scrollState.lastPosition]);

  // Handle scroll position restoration when modal closes
  useEffect(() => {
    if (!type && scrollState.lastPosition > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollState.lastPosition,
          behavior: "smooth",
        });
      });
    }
  }, [type, scrollState.lastPosition]);

  // This ensures content is fully rendered before Safari tries to calculate heights
  useEffect(() => {
    // Force layout recalculation after rendering
    if (items.length > 0) {
      setTimeout(() => {
        window.scrollTo(window.scrollX, window.scrollY);
      }, 10);
    }
  }, [items.length]);

  if (type === "SERVICE") return <ServiceCreate />;
  if (type === "MATERIAL") return <MaterialCreate />;
  if (type === "LABOR") return <LaborCreate />;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-y-2">
      {items.map((item, i) => (
        <Card key={`item-${i}`} className="w-[330px]">
          <CardContent className="m-2 flex flex-col gap-y-3 p-3">
            {Object.keys(item).map((itemKey, j) => {
              switch (itemKey) {
                case "service":
                  return (
                    <div>
                      <Label className="mb-1 font-semibold text-slate-600">Services</Label>
                      <Selector
                        type="SERVICE"
                        label="Service"
                        item={item}
                        list={[...services].reverse()}
                        display="name"
                        onEdit={() => {
                          open("SERVICE", {
                            itemId: item.id,
                            edit: true,
                            service: item.service,
                            serviceDesc: item?.serviceDesc,
                          });
                        }}
                        onSelect={(service) =>
                          useEstimateCreateStore.setState((x) =>
                            create(x, (x) => {
                              x.items[i].service = {
                                ...x.items[i].service,
                                ...service,
                              };
                            })
                          )
                        }
                        onSearch={(search) => {
                          if (search) {
                            const filteredServices = services.filter(
                              (service) =>
                                service.name
                                  .toLowerCase()
                                  .includes(search.toLowerCase())
                            );

                            return filteredServices;
                          } else {
                            return services;
                          }
                        }}
                        onDelete={() =>
                          useEstimateCreateStore.setState((x) => {
                            // set the service to null
                            const items = x.items.map((item, index) => {
                              if (index === i) {
                                return { ...item, service: null };
                              }
                              return item;
                            });
                            return { items };
                          })
                        }
                        index={[i, j]}
                        dropdownsOpen={dropdownsOpen}
                        setDropdownsOpen={setDropdownsOpen}
                      />
                    </div>
                  );
                case "materials":
                  return item.materials.length >= 0 ? (
                    <div className="relative mb-4">
                      <Label className="mb-1 font-semibold text-slate-600">Material/Parts</Label>
                      {item.materials.length > 0 &&
                        item.materials.map((material, j) => (
                          <div
                            className={cn("mt-2.5", j === 0 && "mt-0")}
                            key={`material-${j}`}
                          >
                            <Selector
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
                              onEdit={() =>
                                open("MATERIAL", {
                                  itemId: item.id,
                                  edit: true,
                                  material,
                                  materialIndex: j,
                                })
                              }
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
                                  material,
                                  materialIndex: j,
                                });
                              }}
                              onSearch={(search) => {
                                if (search) {
                                  const filteredMaterials = materials.filter(
                                    (material) =>
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
                          <Selector
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
                                material,
                                materialIndex: j,
                              });
                            }}
                            onSearch={(search) => {
                              if (search) {
                                const filteredMaterials = materials.filter(
                                  (material) =>
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
                      )}
                    </div>
                  ) : null;
                case "labor":
                  return (
                    <div>
                      <Label className="mb-1 font-semibold text-slate-600">Labor</Label>
                      <Selector
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
                              x.items[i].labor = labor;
                            })
                          );

                          open("LABOR", {
                            itemId: item.id,
                            edit: true,
                            labor,
                          });
                        }}
                        onSearch={(search) => {
                          if (search) {
                            const filteredLabors = labors.filter((labor) =>
                              labor.name
                                .toLowerCase()
                                .includes(search.toLowerCase())
                            );

                            return filteredLabors;
                          } else {
                            return labors;
                          }
                        }}
                        onDelete={() =>
                          useEstimateCreateStore.setState((x) => {
                            // set the labor to null
                            const items = x.items.map((item, index) => {
                              if (index === i) {
                                return { ...item, labor: null };
                              }
                              return item;
                            });
                            return { items };
                          })
                        }
                        index={[i, j]}
                        dropdownsOpen={dropdownsOpen}
                        setDropdownsOpen={setDropdownsOpen}
                      />
                    </div>
                  );
                case "tags":
                  return (
                    <div key={`tags-${i}-${j}`}>
                      <Label className="mb-1 font-semibold text-slate-600">Tags</Label>
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
                    </div>
                  );
              }
            })}
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              onClick={() => {
                useEstimateCreateStore.setState((x) => ({
                  items: items.toSpliced(i, 1),
                }));
              }}
              className="bg-red-50 text-red-500"
            >
              Remove
              <CircleX size="1.2em" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
