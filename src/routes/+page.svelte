<script lang="ts">
    import { resolve } from '$app/paths'
</script>

<h1>LemonList</h1>
<p>The Demon list of our Geometry Dash community, starting from Easy Demons.</p>

<ul>
    <li><a href={resolve('/levels')}>Main List</a> - verified and placed levels</li>
    <li><a href={resolve('/levels/future')}>Future List</a> - levels waiting to be verified</li>
    <li><a href={resolve('/players')}>Players</a></li>
</ul>
