<script lang="ts">
    import { resolve } from '$app/paths'
    import GdButton from './GdButton.svelte'
</script>

<!-- For players on the Main and Future List, admins get their tools in the same place instead.
 Guests go through the login first -->
<div class="gd-dark mb-4 flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
    <p class="flex-1">
        Beat a level that isn't on the list? Send it with your completion, the admins will place it
        and your completion becomes a record.
    </p>
    <GdButton href={resolve('/dashboard/submit-level')} size="sm">Request level</GdButton>
</div>
