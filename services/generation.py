import dspy
from owlapy.agen_kg.agent import AGenKG
from owlapy.agen_kg.graph_extracting_models import (
    DomainGraphExtractor,
    OpenGraphExtractor,
)


class ProviderGenerator(AGenKG):
    def __init__(
        self,
        model,
        api_key,
        api_base,
        temperature,
        seed,
        cache,
        enable_logging,
        max_tokens,
    ):
        # AGenKG's constructor forces OpenAI and changes global DSPy settings.
        self.lm = dspy.LM(
            drop_params=True,
            model=model,
            api_key=api_key,
            api_base=api_base,
            temperature=temperature,
            seed=seed,
            cache=cache,
            max_tokens=max_tokens,
        )
        self.open_graph_extractor = OpenGraphExtractor(enable_logging)
        self.domain_graph_extractor = DomainGraphExtractor(enable_logging)

    def generate_ontology(self, **kwargs):
        with dspy.context(lm=self.lm):
            return super().generate_ontology(**kwargs)
