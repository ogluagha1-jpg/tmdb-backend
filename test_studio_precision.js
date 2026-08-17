const { GeminiPoolService } = require('./dist/services/gemini_pool.service');

async function testStudioPrecision() {
  const pool = GeminiPoolService.getInstance();

  const testCases = [
    {
      name: 'Prey (2022) - Should be 20th Century Studios, NOT Netflix',
      movie: {
        title: 'Prey',
        year: 2022,
        overview: 'The origin story of the Predator in the world of the Comanche Nation 300 years ago.',
        currentStudioIds: [178464] // Erroneously tagged with Netflix
      }
    },
    {
      name: 'Spider-Man: No Way Home (2021) - Co-production (Sony + Marvel)',
      movie: {
        title: 'Spider-Man: No Way Home',
        year: 2021,
        overview: 'Peter Parker is unmasked and no longer able to separate his normal life from the high-stakes of being a superhero.',
        currentStudioIds: [5, 420] // Sony (5) + Marvel (420)
      }
    },
    {
      name: 'The Irishman (2019) - Authentic Netflix Original',
      movie: {
        title: 'The Irishman',
        year: 2019,
        overview: 'An illustration of organized crime in post-war America told through the eyes of World War II veteran Frank Sheeran.',
        currentStudioIds: [178464] // Netflix
      }
    },
    {
      name: 'Dune: Part Two (2024) - Warner Bros & Legendary, NOT Netflix',
      movie: {
        title: 'Dune: Part Two',
        year: 2024,
        overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        currentStudioIds: [178464, 174] // Has erroneous Netflix + valid Warner Bros
      }
    }
  ];

  console.log('Testing AI Studio False-Positive Precision & Guardrails...\n');

  for (const tc of testCases) {
    console.log(`=======================================================`);
    console.log(`TEST: ${tc.name}`);
    const result = await pool.enrichMovieWithAi({
      title: tc.movie.title,
      year: tc.movie.year,
      overview: tc.movie.overview,
      currentStudioIds: tc.movie.currentStudioIds
    });
    console.log('Result:', {
      primary_studio: result.primary_studio,
      studio_id: result.studio_id,
      is_original: result.is_original_production,
      false_positives_to_remove: result.false_positive_studio_ids_to_remove
    });
  }
}

testStudioPrecision().catch(console.error);
