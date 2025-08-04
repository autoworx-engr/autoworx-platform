import { PermissionItem, StaticPermissionItem } from "@/app/(dashboard)/awx-dashboard/components/FeaturePermission";

export function formatPermissions(permissions: any[]) {

  const result: any[] = [];



  const directoryChildren = ['clientDirectory', 'fleetDirectory', 'employeeDirectory'];

  const automationChildren = [

    'pipelineAutomation',

    'marketingAutomation',

    'communicationAutomation',

    'serviceAutomation',

    'inventoryAutomation',

    'invoiceAutomation',

  ];

  const communicationHubChildren = ['communicationHubInternal', 'communicationHubClients', 'communicationHubCollaboration']


  // Extract directory and automation parent permissions from the full permissions array

  const directoryParent = permissions?.find((p) => p.permission_name === 'directory');

  const automationParent = permissions?.find((p) => p.permission_name === 'automation');

const communicationHubParent = permissions?.find((p)=>p.permission_name === 'communicationHub')

  const directoryGroup: any = {

    title: 'Directory',

    permission_name: 'directory',

    enabled: directoryParent?.enabled ?? false,

    children: [],

  };



  const automationGroup: any = {

    title: 'All Automation',

    permission_name: 'automation',

    enabled: automationParent?.enabled ?? false,

    children: [],

  };

const communicationHubGroup: any = {
  title: 'Communication Hub',
  permission_name: 'communicationHub',
  enabled: communicationHubParent?.enabled ?? false,
  children: [],

}

  permissions?.forEach((permission: any) => {

    const { permission_name } = permission;



    if (permission_name === 'directory' || permission_name === 'automation' || permission_name === 'communicationHub') {

      // Already handled

      return;

    }



    if (directoryChildren.includes(permission_name)) {

      directoryGroup.children.push(permission);

    } 
    else if (automationChildren.includes(permission_name)) {

      automationGroup.children.push(permission);

    }  else if(communicationHubChildren.includes(permission_name)){
        communicationHubGroup.children.push(permission)
    }else {

      // All other permissions as top-level

      result.push({ ...permission });

    }

  });



  if (directoryGroup.children.length > 0) result.push(directoryGroup);

  if (automationGroup.children.length > 0) result.push(automationGroup);
  if (communicationHubGroup.children.length > 0) result.push(communicationHubGroup);

  

  return result;

}

export default function getMissing(staticArr:StaticPermissionItem[], backendArr:PermissionItem[]) {
  const backendNames = new Set(
    backendArr.map(item =>
     item.permission_name
    )
  );
  return staticArr.filter(sp => !backendNames.has(sp.permission_name));
}
