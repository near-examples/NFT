<script lang="ts">
  import Textfield from "@smui/textfield";
  import { getContext } from "svelte";
  import { lines, parameters, scene } from "./store";

  // TODO: ability to change options

  const { open, close } = getContext("simple-modal");

  const setValues = () => {
    close();
    setTimeout(() => {
      // TODO: set parameters
    }, 500);
  };
</script>

<!-- Update the bellow (preferablly using smui (https://sveltematerialui.com/)
 but if not, that's fine too,
 so that we can set the parameters
 -->
<!-- <div class="field-group">
  <h3>Yaw</h3>
  <Textfield bind:value={yawn} label="Numerator" />
  <Textfield bind:value={yawd} label="Denominator" />
  <Textfield bind:value={yawb} label="Base" />
</div>
<div class="field-group">
  <h3>Pitch</h3>
  <Textfield bind:value={pitchn} label="Numerator" />
  <Textfield bind:value={pitchd} label="Denominator" />
  <Textfield bind:value={pitchb} label="Base" />
</div>
<div class="field-group">
  <h3>distance</h3>
  <Textfield bind:value={distancen} label="Numerator" />
  <Textfield bind:value={distanced} label="Denominator" />
  <Textfield bind:value={distanceb} label="Base" />
</div>
<div class="field-group">
  <h3>Other Parameters</h3>
  <Textfield bind:value={sleepTimeMs} label="Sleep MS between lines" />
</div> -->

<input type="button" value="Refresh Animation" on:click={setValues} />
