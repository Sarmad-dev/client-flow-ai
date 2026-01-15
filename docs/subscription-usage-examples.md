# Subscription Context Usage Examples

## Updated Feature Checks

The `canCreateTask` and `canAddTeamMember` functions now require specific IDs to check limits at the project and organization level respectively.

### Checking Task Creation Limit (Per Project)

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

const MyTaskComponent = () => {
  const { canCreateTask } = useSubscription();
  const projectId = 'your-project-id';

  const handleCreateTask = async () => {
    const canCreate = await canCreateTask(projectId);

    if (!canCreate) {
      alert(
        'You have reached the maximum number of tasks for this project. Please upgrade your plan.'
      );
      return;
    }

    // Proceed with task creation
    // ...
  };

  return <Button onPress={handleCreateTask}>Create Task</Button>;
};
```

### Checking Team Member Addition Limit (Per Organization)

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

const OrganizationMembersComponent = () => {
  const { canAddTeamMember } = useSubscription();
  const organizationId = 'your-organization-id';

  const handleInviteMember = async () => {
    const canAdd = await canAddTeamMember(organizationId);

    if (!canAdd) {
      alert(
        'You have reached the maximum number of team members for this organization. Please upgrade your plan.'
      );
      return;
    }

    // Proceed with member invitation
    // ...
  };

  return <Button onPress={handleInviteMember}>Invite Member</Button>;
};
```

### Using with React Query

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useQuery } from '@tanstack/react-query';

const TaskCreationButton = ({ projectId }: { projectId: string }) => {
  const { canCreateTask } = useSubscription();

  const { data: canCreate, isLoading } = useQuery({
    queryKey: ['canCreateTask', projectId],
    queryFn: () => canCreateTask(projectId),
    staleTime: 30000, // Cache for 30 seconds
  });

  if (isLoading) return <ActivityIndicator />;

  return (
    <Button onPress={handleCreateTask} disabled={!canCreate}>
      {canCreate ? 'Create Task' : 'Upgrade to Create More Tasks'}
    </Button>
  );
};
```

## Security Benefits

These updates provide better security and accuracy:

1. **Project-Level Task Limits**: Tasks are now counted per project, preventing users from exceeding limits on individual projects
2. **Organization-Level Team Member Limits**: Team members are counted per organization, ensuring proper limit enforcement
3. **Real-time Database Checks**: Limits are checked against actual database counts, not cached usage data
4. **RLS Protection**: All queries respect Row Level Security policies in Supabase

## Migration Notes

If you have existing code using these functions:

**Before:**

```typescript
const canCreate = canCreateTask(); // No parameters
const canAdd = canAddTeamMember(); // No parameters
```

**After:**

```typescript
const canCreate = await canCreateTask(projectId); // Requires projectId, returns Promise
const canAdd = await canAddTeamMember(organizationId); // Requires organizationId, returns Promise
```

Make sure to:

1. Add `async/await` to your handler functions
2. Pass the required `projectId` or `organizationId`
3. Handle the Promise return type appropriately
