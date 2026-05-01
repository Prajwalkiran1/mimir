"""Knowledge Graph Construction for Video Content

Builds NetworkX graphs from transcript chunks using:
- Entity extraction (noun phrases, named entities)
- Relation extraction (subject-verb-object triples)
- Temporal anchoring (timestamps)
- Graph analytics (centrality, clustering)
"""

import logging
import pickle
import json
import os
from typing import List, Dict, Any, Tuple, Optional
import networkx as nx
import spacy
from collections import defaultdict, Counter

logger = logging.getLogger(__name__)


class KnowledgeGraph:
    """Knowledge graph builder for video transcript analysis"""
    
    def __init__(self, spacy_model: str = "en_core_web_sm"):
        """
        Initialize knowledge graph builder
        
        Args:
            spacy_model: Name of spaCy model to use
        """
        self.spacy_model = spacy_model
        self.nlp = None
        self.graph = None
        
    def initialize(self):
        """Load spaCy model"""
        try:
            self.nlp = spacy.load(self.spacy_model)
            logger.info(f"Loaded spaCy model: {self.spacy_model}")
        except Exception as e:
            logger.error(f"Failed to load spaCy model: {e}")
            raise
    
    def build_knowledge_graph(self, 
                             chunks: List[Dict[str, Any]], 
                             video_id: str,
                             progress_callback: Optional[callable] = None) -> nx.DiGraph:
        """
        Build knowledge graph from transcript chunks
        
        Args:
            chunks: List of transcript chunks
            video_id: Video identifier
            progress_callback: Progress callback function
            
        Returns:
            NetworkX directed graph
        """
        if not self.nlp:
            self.initialize()
            
        if progress_callback:
            progress_callback("Initializing knowledge graph...", 10)
        
        # Create directed graph
        self.graph = nx.DiGraph(video_id=video_id)
        
        if progress_callback:
            progress_callback("Extracting entities and relations...", 30)
        
        # Extract entities and relations from all chunks
        all_entities = []
        all_relations = []
        
        for i, chunk in enumerate(chunks):
            if progress_callback and i % 10 == 0:
                progress_callback(f"Processing chunk {i+1}/{len(chunks)}...", 30 + (i * 40 // len(chunks)))
            
            entities, relations = self._extract_entities_and_relations(chunk)
            all_entities.extend(entities)
            all_relations.extend(relations)
        
        if progress_callback:
            progress_callback("Building graph structure...", 70)
        
        # Add nodes and edges to graph
        self._add_entities_to_graph(all_entities)
        self._add_relations_to_graph(all_relations)
        
        if progress_callback:
            progress_callback("Computing graph analytics...", 90)
        
        # Compute graph metrics
        self._compute_graph_metrics()
        
        if progress_callback:
            progress_callback(f"Knowledge graph complete: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges", 100)
        
        return self.graph
    
    def _extract_entities_and_relations(self, chunk: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract entities and relations from a chunk"""
        doc = self.nlp(chunk["text"])
        entities = []
        relations = []
        
        # Extract entities
        # 1. Noun phrases as concepts
        for noun_chunk in doc.noun_chunks:
            if len(noun_chunk.text.split()) <= 4:  # Filter out very long phrases
                entities.append({
                    "text": noun_chunk.text.lower().strip(),
                    "label": "CONCEPT",
                    "chunk_id": chunk["chunk_id"],
                    "time_start": chunk["time_start"],
                    "time_end": chunk["time_end"],
                    "confidence": self._compute_entity_confidence(noun_chunk)
                })
        
        # 2. Named entities
        for ent in doc.ents:
            entities.append({
                "text": ent.text.lower().strip(),
                "label": ent.label_,
                "chunk_id": chunk["chunk_id"],
                "time_start": chunk["time_start"],
                "time_end": chunk["time_end"],
                "confidence": self._compute_entity_confidence(ent)
            })
        
        # Extract relations (subject-verb-object triples)
        for token in doc:
            if token.dep_ == "ROOT" and token.pos_ == "VERB":
                # Find subjects
                subjects = [child for child in token.children if child.dep_ in {"nsubj", "nsubjpass"}]
                # Find objects
                objects = [child for child in token.children if child.dep_ in {"dobj", "pobj", "attr"}]
                
                for subj in subjects:
                    for obj in objects:
                        relations.append({
                            "subject": subj.text.lower().strip(),
                            "predicate": token.lemma_.lower().strip(),
                            "object": obj.text.lower().strip(),
                            "chunk_id": chunk["chunk_id"],
                            "time_start": chunk["time_start"],
                            "time_end": chunk["time_end"],
                            "confidence": self._compute_relation_confidence(subj, token, obj)
                        })
        
        return entities, relations
    
    def _compute_entity_confidence(self, entity) -> float:
        """Compute confidence score for an entity"""
        # Base confidence depends on entity type
        if hasattr(entity, 'label_'):
            if entity.label_ in ["PERSON", "ORG", "GPE", "PRODUCT"]:
                base_confidence = 0.9
            elif entity.label_ in ["DATE", "TIME", "MONEY", "QUANTITY"]:
                base_confidence = 0.85
            else:
                base_confidence = 0.7
        else:
            # For noun chunks
            base_confidence = 0.6
        
        # Adjust based on length and complexity
        text = entity.text.lower().strip()
        if len(text.split()) == 1:
            base_confidence *= 0.9  # Single words might be less specific
        elif len(text.split()) > 3:
            base_confidence *= 0.8  # Very long phrases might be noisy
        
        return min(base_confidence, 1.0)
    
    def _compute_relation_confidence(self, subj: Any, verb: Any, obj: Any) -> float:
        """Compute confidence score for a relation"""
        base_confidence = 0.7
        
        # Boost confidence for clear grammatical structures
        if subj.dep_ == "nsubj" and obj.dep_ == "dobj":
            base_confidence = 0.85
        elif subj.dep_ == "nsubjpass" and obj.dep_ in {"pobj", "attr"}:
            base_confidence = 0.8
        
        # Adjust based on verb specificity
        if verb.lemma_ in ["be", "have", "do"]:
            base_confidence *= 0.8  # Common verbs might be less informative
        
        return min(base_confidence, 1.0)
    
    def _add_entities_to_graph(self, entities: List[Dict[str, Any]]):
        """Add entity nodes to the graph"""
        for entity in entities:
            node_id = entity["text"].lower().strip()
            
            if self.graph.has_node(node_id):
                # Update existing node
                node_data = self.graph.nodes[node_id]
                node_data["mentions"].append(entity["time_start"])
                node_data["chunk_ids"].add(entity["chunk_id"])
                node_data["confidence"] = max(node_data["confidence"], entity["confidence"])
            else:
                # Add new node
                self.graph.add_node(
                    node_id,
                    label=entity["label"],
                    mentions=[entity["time_start"]],
                    chunk_ids={entity["chunk_id"]},
                    time_start=entity["time_start"],
                    time_end=entity["time_end"],
                    confidence=entity["confidence"],
                    entity_type=entity["label"]
                )
    
    def _add_relations_to_graph(self, relations: List[Dict[str, Any]]):
        """Add relation edges to the graph"""
        for relation in relations:
            src = relation["subject"].lower().strip()
            dst = relation["object"].lower().strip()
            
            # Ensure nodes exist
            if not self.graph.has_node(src):
                self.graph.add_node(
                    src,
                    label="MISC",
                    mentions=[],
                    chunk_ids=set(),
                    time_start=relation["time_start"],
                    time_end=relation["time_end"],
                    confidence=0.5,
                    entity_type="MISC"
                )
            
            if not self.graph.has_node(dst):
                self.graph.add_node(
                    dst,
                    label="MISC",
                    mentions=[],
                    chunk_ids=set(),
                    time_start=relation["time_start"],
                    time_end=relation["time_end"],
                    confidence=0.5,
                    entity_type="MISC"
                )
            
            # Add or update edge
            if self.graph.has_edge(src, dst):
                edge_data = self.graph[src][dst]
                edge_data["predicates"].append(relation["predicate"])
                edge_data["chunk_ids"].add(relation["chunk_id"])
                edge_data["confidence"] = max(edge_data["confidence"], relation["confidence"])
            else:
                self.graph.add_edge(
                    src, dst,
                    predicates=[relation["predicate"]],
                    chunk_ids={relation["chunk_id"]},
                    time_start=relation["time_start"],
                    time_end=relation["time_end"],
                    confidence=relation["confidence"],
                    relation_type="semantic"
                )
    
    def _compute_graph_metrics(self):
        """Compute graph analytics and metrics"""
        if not self.graph:
            return
        
        # Compute centrality measures
        try:
            degree_centrality = nx.degree_centrality(self.graph)
            betweenness_centrality = nx.betweenness_centrality(self.graph)
            closeness_centrality = nx.closeness_centrality(self.graph)
            
            # Add metrics to nodes
            for node in self.graph.nodes():
                node_data = self.graph.nodes[node]
                node_data["degree_centrality"] = degree_centrality.get(node, 0.0)
                node_data["betweenness_centrality"] = betweenness_centrality.get(node, 0.0)
                node_data["closeness_centrality"] = closeness_centrality.get(node, 0.0)
        except Exception as e:
            logger.warning(f"Failed to compute graph metrics: {e}")
        
        # Compute graph-level statistics
        try:
            density = nx.density(self.graph)
            clustering = nx.average_clustering(self.graph.to_undirected())
            
            self.graph.graph["density"] = density
            self.graph.graph["clustering_coefficient"] = clustering
            self.graph.graph["num_connected_components"] = nx.number_connected_components(self.graph.to_undirected())
        except Exception as e:
            logger.warning(f"Failed to compute graph statistics: {e}")
    
    def search_entities(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """Search for entities matching the query"""
        if not self.graph:
            return []
        
        query_lower = query.lower()
        results = []
        
        for node in self.graph.nodes():
            node_data = self.graph.nodes[node]
            
            # Check if query matches node text or labels
            match_score = 0.0
            if query_lower in node.lower():
                match_score = 1.0
            elif any(query_lower in label.lower() for label in node_data.get("label", "").split()):
                match_score = 0.8
            elif node_data.get("entity_type", "").lower() in query_lower:
                match_score = 0.6
            
            if match_score > 0:
                results.append({
                    "entity": node,
                    "match_score": match_score,
                    "confidence": node_data.get("confidence", 0.0),
                    "mentions": node_data.get("mentions", []),
                    "entity_type": node_data.get("entity_type", ""),
                    "degree_centrality": node_data.get("degree_centrality", 0.0),
                    "chunk_ids": list(node_data.get("chunk_ids", set()))
                })
        
        # Sort by combined score
        results.sort(key=lambda x: x["match_score"] * x["confidence"], reverse=True)
        return results[:top_k]
    
    def get_related_entities(self, entity: str, relation_type: Optional[str] = None, top_k: int = 10) -> List[Dict[str, Any]]:
        """Get entities related to the given entity"""
        if not self.graph or not self.graph.has_node(entity):
            return []
        
        related = []
        node_data = self.graph.nodes[entity]
        
        # Get outgoing neighbors
        for neighbor in self.graph.successors(entity):
            edge_data = self.graph[entity][neighbor]
            if relation_type is None or relation_type in edge_data.get("predicates", []):
                related.append({
                    "entity": neighbor,
                    "relation": "outgoing",
                    "predicates": edge_data.get("predicates", []),
                    "confidence": edge_data.get("confidence", 0.0),
                    "chunk_ids": list(edge_data.get("chunk_ids", set()))
                })
        
        # Get incoming neighbors
        for neighbor in self.graph.predecessors(entity):
            edge_data = self.graph[neighbor][entity]
            if relation_type is None or relation_type in edge_data.get("predicates", []):
                related.append({
                    "entity": neighbor,
                    "relation": "incoming",
                    "predicates": edge_data.get("predicates", []),
                    "confidence": edge_data.get("confidence", 0.0),
                    "chunk_ids": list(edge_data.get("chunk_ids", set()))
                })
        
        # Sort by confidence
        related.sort(key=lambda x: x["confidence"], reverse=True)
        return related[:top_k]
    
    def get_graph_summary(self) -> Dict[str, Any]:
        """Get summary statistics about the knowledge graph"""
        if not self.graph:
            return {}
        
        # Entity type distribution
        entity_types = Counter()
        for node in self.graph.nodes():
            entity_type = self.graph.nodes[node].get("entity_type", "UNKNOWN")
            entity_types[entity_type] += 1
        
        # Relation type distribution
        relation_types = Counter()
        for src, dst in self.graph.edges():
            edge_data = self.graph[src][dst]
            for predicate in edge_data.get("predicates", []):
                relation_types[predicate] += 1
        
        # Top entities by centrality
        top_entities = sorted(
            [(node, self.graph.nodes[node].get("degree_centrality", 0.0)) 
             for node in self.graph.nodes()],
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            "num_nodes": self.graph.number_of_nodes(),
            "num_edges": self.graph.number_of_edges(),
            "density": self.graph.graph.get("density", 0.0),
            "clustering_coefficient": self.graph.graph.get("clustering_coefficient", 0.0),
            "num_connected_components": self.graph.graph.get("num_connected_components", 0),
            "entity_types": dict(entity_types.most_common()),
            "relation_types": dict(relation_types.most_common(10)),
            "top_entities": top_entities
        }
    
    def save_graph(self, output_dir: str, video_id: str):
        """Save knowledge graph to disk"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save as pickle
        kg_path = os.path.join(output_dir, f"{video_id}_knowledge_graph.pkl")
        with open(kg_path, "wb") as f:
            pickle.dump(self.graph, f)
        
        # Save human-readable edge list
        kg_json_path = os.path.join(output_dir, f"{video_id}_kg_edges.json")
        edges_data = []
        for src, dst in self.graph.edges():
            edge_data = self.graph[src][dst]
            edges_data.append({
                "source": src,
                "target": dst,
                "predicates": edge_data.get("predicates", []),
                "confidence": edge_data.get("confidence", 0.0),
                "chunk_ids": list(edge_data.get("chunk_ids", set()))
            })
        
        with open(kg_json_path, "w") as f:
            json.dump(edges_data[:200], f, indent=2)  # Sample for inspection
        
        # Save graph summary
        summary_path = os.path.join(output_dir, f"{video_id}_kg_summary.json")
        with open(summary_path, "w") as f:
            json.dump(self.get_graph_summary(), f, indent=2)
        
        logger.info(f"Saved knowledge graph to {kg_path}")
        return kg_path
    
    @classmethod
    def load_graph(cls, graph_path: str) -> nx.DiGraph:
        """Load knowledge graph from disk"""
        with open(graph_path, "rb") as f:
            graph = pickle.load(f)
        return graph
